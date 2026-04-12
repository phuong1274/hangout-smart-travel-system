using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class CustomLocationConfiguration : IEntityTypeConfiguration<CustomLocation>
    {
        public void Configure(EntityTypeBuilder<CustomLocation> builder)
        {
            builder.ToTable("CustomLocations");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Latitude)
                .IsRequired();

            builder.Property(x => x.Longitude)
                .IsRequired();

            builder.Property(x => x.Address)
                .HasMaxLength(500);

           
        }
    }
}
