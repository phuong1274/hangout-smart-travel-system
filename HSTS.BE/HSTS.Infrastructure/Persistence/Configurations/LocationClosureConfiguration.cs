using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationClosureConfiguration : IEntityTypeConfiguration<LocationClosure>
    {
        public void Configure(EntityTypeBuilder<LocationClosure> builder)
        {
            builder.ToTable("LocationClosures");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.LocationId)
                .IsRequired();

            builder.Property(x => x.StartDate)
                .IsRequired();

            builder.Property(x => x.EndDate)
                .IsRequired();

            builder.Property(x => x.Reason)
                .HasMaxLength(500)
                .IsRequired(false);

            builder.Property(x => x.IsActive)
                .IsRequired();

            // Configure relationship with Location
            builder.HasOne(x => x.Location)
                   .WithMany(l => l.Closures)
                   .HasForeignKey(x => x.LocationId)
                   .OnDelete(DeleteBehavior.Cascade);

            // Index for efficient querying of active closures by location and date
            builder.HasIndex(x => new { x.LocationId, x.IsActive, x.StartDate, x.EndDate });
        }
    }
}
