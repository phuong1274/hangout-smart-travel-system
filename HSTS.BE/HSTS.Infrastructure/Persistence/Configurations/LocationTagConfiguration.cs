using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationTagConfiguration : IEntityTypeConfiguration<LocationTag>
    {
        public void Configure(EntityTypeBuilder<LocationTag> builder)
        {
            builder.ToTable("LocationTags");
            builder.HasKey(x => new { x.LocationId, x.TagId });

            // Configure relationship with Location
            builder.HasOne(lt => lt.Location)
                   .WithMany(l => l.LocationTags)
                   .HasForeignKey(lt => lt.LocationId)
                   .OnDelete(DeleteBehavior.Cascade);

            // Configure relationship with Tag
            builder.HasOne(lt => lt.Tag)
                   .WithMany(t => t.LocationTags)
                   .HasForeignKey(lt => lt.TagId)
                   .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
