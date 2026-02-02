using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using HSTS.Infrastructure.Persistence;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        IConfigurationRoot configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../HSTS.API"))
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables()
            .Build();

        var builder = new DbContextOptionsBuilder<AppDbContext>();

        var connectionString = configuration.GetConnectionString("DefaultConnection");

        var serverVersion = new MySqlServerVersion(new Version(8, 0, 36));

        builder.UseMySql(connectionString, serverVersion);

        return new AppDbContext(builder.Options);
    }
}