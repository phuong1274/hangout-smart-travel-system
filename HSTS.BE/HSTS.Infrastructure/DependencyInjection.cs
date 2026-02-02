using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HSTS.Infrastructure.Persistence;
using HSTS.Infrastructure.Repositories;
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

            services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));

            //Service registrations for logging services can be added here
            services.AddScoped<ILoggingService, Logging>();

            return services;
        }
    }
}
