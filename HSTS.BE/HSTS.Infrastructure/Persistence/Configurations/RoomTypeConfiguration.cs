using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations;

internal class RoomTypeConfiguration : IEntityTypeConfiguration<RoomType>
{
    public void Configure(EntityTypeBuilder<RoomType> builder)
    {
        builder.ToTable("RoomTypes");
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(100);
            
        builder.Property(x => x.PricePerNight)
            .HasPrecision(18, 2);
            
        builder.Property(x => x.PricePerHour)
            .HasPrecision(18, 2);
            
        // Configure Amenities as a JSON string (EF Core 8+ supports primitive collections)
        builder.Property(x => x.Amenities)
            .HasColumnType("json");
            
        builder.HasOne(x => x.Location)
            .WithMany(x => x.RoomTypes)
            .HasForeignKey(x => x.LocationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
