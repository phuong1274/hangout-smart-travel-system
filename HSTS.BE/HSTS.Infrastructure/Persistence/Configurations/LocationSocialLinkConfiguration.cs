using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationSocialLinkConfiguration : IEntityTypeConfiguration<LocationSocialLink>
    {
        public void Configure(EntityTypeBuilder<LocationSocialLink> builder)
        {
            builder.ToTable("LocationSocialLinks");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Platform)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.Url)
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(x => x.LocationId)
                .IsRequired();

            // Configure relationship with Location
            builder.HasOne(sl => sl.Location)
                   .WithMany(l => l.SocialLinks)
                   .HasForeignKey(sl => sl.LocationId)
                   .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
