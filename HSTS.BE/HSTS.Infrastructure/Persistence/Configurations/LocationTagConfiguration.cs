using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationTagConfiguration : IEntityTypeConfiguration<LocationTag>
    {
        public void Configure(EntityTypeBuilder<LocationTag> builder)
        {
            // Define the composite primary key
            builder.HasKey(lt => new { lt.LocationId, lt.TagId });

            // Configure foreign key relationship with Location
            builder.HasOne(lt => lt.Location)
                .WithMany(l => l.LocationTags)
                .HasForeignKey(lt => lt.LocationId);

            // Configure foreign key relationship with Tag
            builder.HasOne(lt => lt.Tag)
                .WithMany(t => t.LocationTags)
                .HasForeignKey(lt => lt.TagId);

            // Configure other properties
            builder.Property(lt => lt.Score)
                .IsRequired();
        }
    }
}