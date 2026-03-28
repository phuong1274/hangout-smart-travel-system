using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HSTS.Infrastructure.Persistence;
using HSTS.Infrastructure.Repositories;
using HSTS.Infrastructure.Services;
using HSTS.Infrastructure.Settings;
using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Interfaces;
using HSTS.Application.Itineraries.Interfaces;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            services.AddDbContext<AppDbContext>(options =>
                options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

            services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
            services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));

            // Logging
            services.AddScoped<ILoggingService, Logging>();

            // Auth services
            services.AddScoped<IPasswordHasher, PasswordHasher>();
            services.AddScoped<IJwtService, JwtService>();
            services.AddScoped<IGoogleAuthService, GoogleAuthService>();
            services.Configure<ResendSettings>(configuration.GetSection("Resend"));
            services.Configure<EmailPolicySettings>(configuration.GetSection("EmailPolicy"));
            services.AddSingleton<IEmailDomainPolicy, EmailDomainPolicy>();
            services.AddHttpClient<IEmailService, EmailService>(client =>
            {
                client.BaseAddress = new Uri("https://api.resend.com/");
            });
            services.AddScoped<ICurrentUserService, CurrentUserService>();

            // Cloudinary
            services.Configure<CloudinarySettings>(configuration.GetSection("Cloudinary"));
            services.AddScoped<ICloudinaryService, CloudinaryService>();

            // Smart itinerary services
            services.AddScoped<IInterCityRouteEstimator, HeuristicInterCityRouteEstimator>();

            return services;
        }
    }
}
