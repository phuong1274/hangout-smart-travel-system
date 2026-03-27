using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations;

internal class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.ToTable("Locations");
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);
            
        builder.Property(x => x.Latitude)
            .HasPrecision(18, 10);
            
        builder.Property(x => x.Longitude)
            .HasPrecision(18, 10);
            
        builder.Property(x => x.AverageBudget)
            .HasPrecision(18, 2);
            
        // Configure Tags as a JSON string (EF Core 8+ supports primitive collections)
        builder.Property(x => x.Tags)
            .HasColumnType("json");

        builder.HasOne(x => x.District)
            .WithMany(x => x.Locations)
            .HasForeignKey(x => x.DistrictId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.OpeningHours)
            .WithOne(x => x.Location)
            .HasForeignKey(x => x.LocationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.RoomTypes)
            .WithOne(x => x.Location)
            .HasForeignKey(x => x.LocationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
