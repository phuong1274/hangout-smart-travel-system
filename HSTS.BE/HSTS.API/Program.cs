using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using HSTS.API.Middleware;
using HSTS.Application.Auth.Interfaces;
using HSTS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace HSTS.API
{
    public class Program
    {
        private const string BaselineMigrationId = "20260418193423_BaselineFromCurrentCode";
        private const string TransportSchemaSyncMigrationId = "20260422225513_TransportSchemaSync";

        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Rate limiting
            builder.Services.AddRateLimiter(options =>
            {
                options.AddFixedWindowLimiter(policyName: "fixed", opt =>
                {
                    opt.PermitLimit = 100;
                    opt.Window = TimeSpan.FromSeconds(10);
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 20;
                });

                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            });

            // JWT Authentication — read token from HttpOnly cookie
            var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]
                ?? throw new InvalidOperationException("Jwt:SecretKey is not configured.");

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = builder.Configuration["Jwt:Issuer"],
                        ValidAudience = builder.Configuration["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
                        ClockSkew = TimeSpan.FromSeconds(30)
                    };

                    // Read JWT from HttpOnly cookie instead of Authorization header
                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            context.Token = context.Request.Cookies["access_token"];
                            return Task.CompletedTask;
                        },
                        OnTokenValidated = async context =>
                        {
                            var accountIdValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                                ?? context.Principal?.FindFirstValue("sub");

                            if (!int.TryParse(accountIdValue, out var accountId))
                            {
                                context.Fail("Invalid account identifier.");
                                return;
                            }

                            var accessPolicy = context.HttpContext.RequestServices.GetRequiredService<IAccountAccessPolicy>();
                            var canAccess = await accessPolicy.CanAccessAsync(accountId, context.HttpContext.RequestAborted);

                            if (!canAccess)
                                context.Fail("Account is not active.");
                        }
                    };
                });

            builder.Services.AddAuthorization();

            // CORS — allow frontend dev server
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                        ?? new[] { "http://localhost:3000",
                                    "http://localhost:5173" };

                    policy.SetIsOriginAllowed(origin =>
                        origins.Contains(origin, StringComparer.OrdinalIgnoreCase)
                        || (Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                            && (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                                || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))))
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                });
            });

            // Add services to the container
            builder.Services.AddInfrastructure(builder.Configuration);
            builder.Services.AddApplication();
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

                EnsureMigrationHistoryAligned(db, logger);
                db.Database.Migrate();
            }

            app.UseRateLimiter();

            // Short-circuit early when the database cannot be reached
            app.Use(async (context, next) =>
            {
                try { await next(); }
                catch (Exception ex) when (ex is System.Data.Common.DbException ||
                    (ex is Microsoft.EntityFrameworkCore.DbUpdateException due && due.InnerException is System.Data.Common.DbException))
                {
                    if (!context.Response.HasStarted)
                    {
                        context.Response.Clear();
                        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    }
                    await context.Response.CompleteAsync();
                }
            });

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            app.UseCors("AllowFrontend");

            app.UseAuthentication();
            app.UseAuthorization();

            // CSRF protection for cookie-based auth
            app.UseMiddleware<CsrfMiddleware>();

            app.MapControllers();

            app.Run();
        }

        private static void EnsureMigrationHistoryAligned(AppDbContext db, ILogger logger)
        {
            if (!db.Database.CanConnect())
            {
                logger.LogWarning("Skipping migration history alignment because the database connection is unavailable.");
                return;
            }

            EnsureMigrationHistoryTable(db);

            var applied = db.Database.GetAppliedMigrations().ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (applied.Count > 0)
            {
                logger.LogInformation("Existing migration history detected: {AppliedMigrations}", string.Join(", ", applied));
                return;
            }

            var businessTables = new[] { "Accounts", "TransportModes", "LocalTransportMetrics" };
            var existingBusinessTables = businessTables.Where(table => TableExists(db, table)).ToArray();

            if (existingBusinessTables.Length == 0)
            {
                logger.LogInformation("No business tables detected. Treating database as empty and letting EF apply migrations normally.");
                return;
            }

            if (existingBusinessTables.Length != businessTables.Length)
            {
                throw new InvalidOperationException(
                    "Database has partial baseline schema but no migration history. " +
                    $"Expected tables [{string.Join(", ", businessTables)}], found [{string.Join(", ", existingBusinessTables)}]. " +
                    "Refusing automatic migration adoption because the schema state is ambiguous.");
            }

            var transportSchemaState = DetectLocalTransportMetricsSchemaState(db);
            var efVersion = typeof(DbContext).Assembly.GetName().Version!.ToString(3);

            using var transaction = db.Database.BeginTransaction();

            InsertMigrationHistory(db, BaselineMigrationId, efVersion);
            logger.LogWarning(
                "Adopted existing schema as baseline migration {MigrationId} because business tables already exist without migration history.",
                BaselineMigrationId);

            if (transportSchemaState == LocalTransportMetricsSchemaState.PostTransportSync)
            {
                InsertMigrationHistory(db, TransportSchemaSyncMigrationId, efVersion);
                logger.LogWarning(
                    "Detected post-sync LocalTransportMetrics schema; adopted migration {MigrationId} as already applied.",
                    TransportSchemaSyncMigrationId);
            }
            else
            {
                logger.LogInformation(
                    "Detected pre-sync LocalTransportMetrics schema; {MigrationId} will remain pending and run through EF migrations.",
                    TransportSchemaSyncMigrationId);
            }

            transaction.Commit();
        }

        private static void EnsureMigrationHistoryTable(AppDbContext db)
        {
            db.Database.ExecuteSqlRaw("""
                CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
                    `MigrationId` varchar(150) NOT NULL,
                    `ProductVersion` varchar(32) NOT NULL,
                    PRIMARY KEY (`MigrationId`)
                );
                """);
        }

        private static void InsertMigrationHistory(AppDbContext db, string migrationId, string productVersion)
        {
            db.Database.ExecuteSqlRaw(
                "INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`) VALUES ({0}, {1});",
                migrationId,
                productVersion);
        }

        private static bool TableExists(AppDbContext db, string tableName)
            => QueryExists(
                db,
                "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = {0} LIMIT 1;",
                tableName);

        private static bool ColumnExists(AppDbContext db, string tableName, string columnName)
            => QueryExists(
                db,
                "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = {0} AND COLUMN_NAME = {1} LIMIT 1;",
                tableName,
                columnName);

        private static bool QueryExists(AppDbContext db, string sql, params object[] parameters)
            => db.Database.SqlQueryRaw<int>(sql, parameters).Any();

        private static LocalTransportMetricsSchemaState DetectLocalTransportMetricsSchemaState(AppDbContext db)
        {
            const string tableName = "LocalTransportMetrics";

            var hasCostPerKm = ColumnExists(db, tableName, "CostPerKm");
            var hasPricePerKm = ColumnExists(db, tableName, "PricePerKm");
            var hasBaseDistance = ColumnExists(db, tableName, "BaseDistance");
            var hasBaseFare = ColumnExists(db, tableName, "BaseFare");
            var hasCongestionFeePerMinute = ColumnExists(db, tableName, "CongestionFeePerMinute");
            var hasLongDistancePricePerKm = ColumnExists(db, tableName, "LongDistancePricePerKm");
            var hasLongDistanceThreshold = ColumnExists(db, tableName, "LongDistanceThreshold");

            var hasAnyPostSyncColumns = hasBaseDistance
                || hasBaseFare
                || hasCongestionFeePerMinute
                || hasLongDistancePricePerKm
                || hasLongDistanceThreshold;

            var hasAllPostSyncColumns = hasBaseDistance
                && hasBaseFare
                && hasCongestionFeePerMinute
                && hasLongDistancePricePerKm
                && hasLongDistanceThreshold;

            if (hasCostPerKm && !hasPricePerKm && !hasAnyPostSyncColumns)
                return LocalTransportMetricsSchemaState.PreTransportSync;

            if (!hasCostPerKm && hasPricePerKm && hasAllPostSyncColumns)
                return LocalTransportMetricsSchemaState.PostTransportSync;

            throw new InvalidOperationException(
                "Database contains LocalTransportMetrics but its schema does not match a supported migration fingerprint. " +
                $"Detected columns: CostPerKm={hasCostPerKm}, PricePerKm={hasPricePerKm}, BaseDistance={hasBaseDistance}, " +
                $"BaseFare={hasBaseFare}, CongestionFeePerMinute={hasCongestionFeePerMinute}, " +
                $"LongDistancePricePerKm={hasLongDistancePricePerKm}, LongDistanceThreshold={hasLongDistanceThreshold}. " +
                "Refusing automatic migration adoption because the schema state is ambiguous.");
        }

        private enum LocalTransportMetricsSchemaState
        {
            PreTransportSync,
            PostTransportSync,
        }
    }
}
