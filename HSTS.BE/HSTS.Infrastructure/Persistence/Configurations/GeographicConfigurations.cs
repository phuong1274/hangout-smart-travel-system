using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    public class CountryConfiguration : IEntityTypeConfiguration<Country>
    {
        public void Configure(EntityTypeBuilder<Country> builder)
        {
            builder.HasKey(c => c.Id);
            builder.Property(c => c.Name).IsRequired().HasMaxLength(100);
            builder.Property(c => c.CountryCode).IsRequired().HasMaxLength(10);
            
            builder.HasMany(c => c.Provinces)
                .WithOne(p => p.Country)
                .HasForeignKey(p => p.CountryId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class ProvinceConfiguration : IEntityTypeConfiguration<Province>
    {
        public void Configure(EntityTypeBuilder<Province> builder)
        {
            builder.HasKey(p => p.Id);
            builder.Property(p => p.Name).IsRequired().HasMaxLength(100);
            builder.Property(p => p.EnglishName).IsRequired().HasMaxLength(100);
            builder.Property(p => p.ProvinceCode).IsRequired().HasMaxLength(10);
            
            builder.HasMany(p => p.Districts)
                .WithOne(d => d.Province)
                .HasForeignKey(d => d.ProvinceId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class DistrictConfiguration : IEntityTypeConfiguration<District>
    {
        public void Configure(EntityTypeBuilder<District> builder)
        {
            builder.HasKey(d => d.Id);
            builder.Property(d => d.Name).IsRequired().HasMaxLength(100);
            
            builder.HasMany(d => d.Locations)
                .WithOne(l => l.District)
                .HasForeignKey(l => l.DistrictId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class LocationConfiguration : IEntityTypeConfiguration<Location>
    {
        public void Configure(EntityTypeBuilder<Location> builder)
        {
            builder.HasKey(l => l.Id);
            builder.Property(l => l.Name).IsRequired().HasMaxLength(200);
            builder.Property(l => l.Latitude).HasPrecision(18, 10);
            builder.Property(l => l.Longitude).HasPrecision(18, 10);
            builder.Property(l => l.AverageBudget).HasPrecision(18, 2);
            
            // EF Core 8 primitive collection
            builder.Property(l => l.Tags).HasColumnType("json");

            builder.HasMany(l => l.OpeningHours)
                .WithOne(oh => oh.Location)
                .HasForeignKey(oh => oh.LocationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(l => l.RoomTypes)
                .WithOne(rt => rt.Location)
                .HasForeignKey(rt => rt.LocationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class OpeningHoursConfiguration : IEntityTypeConfiguration<OpeningHours>
    {
        public void Configure(EntityTypeBuilder<OpeningHours> builder)
        {
            builder.HasKey(oh => oh.Id);
        }
    }

    public class RoomTypeConfiguration : IEntityTypeConfiguration<RoomType>
    {
        public void Configure(EntityTypeBuilder<RoomType> builder)
        {
            builder.HasKey(rt => rt.Id);
            builder.Property(rt => rt.Name).IsRequired().HasMaxLength(100);
            builder.Property(rt => rt.PricePerNight).HasPrecision(18, 2);
            builder.Property(rt => rt.PricePerHour).HasPrecision(18, 2);
            
            // EF Core 8 primitive collection
            builder.Property(rt => rt.Amenities).HasColumnType("json");
        }
    }
}
