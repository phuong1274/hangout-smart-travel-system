using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationAmenityConfiguration : IEntityTypeConfiguration<LocationAmenity>
    {
        public void Configure(EntityTypeBuilder<LocationAmenity> builder)
        {
            builder.ToTable("LocationAmenities");
            builder.HasKey(x => new { x.LocationId, x.AmenityId });

            builder.Property(x => x.LocationId)
                .IsRequired();

            builder.Property(x => x.AmenityId)
                .IsRequired();

            builder.HasOne(la => la.Location)
                   .WithMany(l => l.LocationAmenities)
                   .HasForeignKey(la => la.LocationId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(la => la.Amenity)
                   .WithMany(a => a.LocationAmenities)
                   .HasForeignKey(la => la.AmenityId)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
