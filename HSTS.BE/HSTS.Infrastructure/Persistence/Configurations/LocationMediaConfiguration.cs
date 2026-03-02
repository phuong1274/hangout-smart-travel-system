using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationMediaConfiguration : IEntityTypeConfiguration<LocationMedia>
    {
        public void Configure(EntityTypeBuilder<LocationMedia> builder)
        {
            builder.ToTable("LocationMedias");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Link)
                .HasMaxLength(2000)
                .IsRequired();

            builder.Property(x => x.LocationId)
                .IsRequired();

            // Configure relationship with Location
            builder.HasOne(lm => lm.Location)
                   .WithMany(l => l.LocationMedias)
                   .HasForeignKey(lm => lm.LocationId);
        }
    }
}
