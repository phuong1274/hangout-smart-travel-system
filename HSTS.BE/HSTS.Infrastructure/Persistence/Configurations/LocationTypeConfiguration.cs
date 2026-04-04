using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationTypeConfiguration : IEntityTypeConfiguration<LocationType>
    {
        public void Configure(EntityTypeBuilder<LocationType> builder)
        {
            builder.ToTable("LocationTypes");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(200)
                .IsRequired(false);

            // Seed data - matching the original enum values
            builder.HasData(
                new LocationType { Id = 1, Name = "Attraction", Description = "Tourist attractions and points of interest" },
                new LocationType { Id = 2, Name = "Restaurant", Description = "Dining establishments and food venues" },
                new LocationType { Id = 3, Name = "Accommodation", Description = "Hotels, resorts, and lodging options" },
                new LocationType { Id = 4, Name = "Shopping", Description = "Shopping centers, markets, and retail stores" },
                new LocationType { Id = 5, Name = "TravelService", Description = "Travel agencies and transportation services" }
            );
        }
    }
}
