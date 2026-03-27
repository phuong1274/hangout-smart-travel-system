using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HSTS.Infrastructure.Persistence;

public static class MasterDataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (!await context.Countries.AnyAsync())
        {
            // TODO: Paste JSON data here
            var countries = new List<Country>
            {
                new Country { Name = "Vietnam", CountryCode = "VN" }
            };
            context.Countries.AddRange(countries);
            await context.SaveChangesAsync();
        }

        // Add similar logic for Provinces, Districts, Locations, and Transport Hubs
    }
}
