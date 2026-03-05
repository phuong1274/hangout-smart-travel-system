using System.Data.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Threading.RateLimiting;

namespace HSTS.API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddRateLimiter(options =>
            {
                options.AddFixedWindowLimiter(policyName: "fixed", opt =>
                {
                    opt.PermitLimit = 10; 
                    opt.Window = TimeSpan.FromSeconds(10); 
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 2; 
                });

                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            });

            // Add services to the container.
            builder.Services.AddInfrastructure(builder.Configuration);
            builder.Services.AddApplication();
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // Short-circuit early when the database cannot be reached so the client gets a bare 500.
            app.Use(async (context, next) =>
            {
                try
                {
                    await next();
                }
                catch (Exception exception) when (IsDatabaseConnectionException(exception))
                {
                    await HandleDatabaseConnectionFailureAsync(context);
                }
            });

            app.UseRateLimiter();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }

        private static bool IsDatabaseConnectionException(Exception exception) => exception switch
        {
            DbException => true,
            DbUpdateException dbUpdateException when dbUpdateException.InnerException is DbException => true,
            _ => false
        };

        private static async Task HandleDatabaseConnectionFailureAsync(HttpContext context)
        {
            if (!context.Response.HasStarted)
            {
                context.Response.Clear();
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            }

            await context.Response.CompleteAsync();
        }
    }
}
