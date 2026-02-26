using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationTypeConfiguration : IEntityTypeConfiguration<LocationType>
    {
        public void Configure(EntityTypeBuilder<LocationType> builder)
        {
            builder.ToTable("LocationTypes");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                   .ValueGeneratedOnAdd();

            builder.Property(x => x.Name)
                   .HasMaxLength(100)
                   .IsRequired();

            // Unique Name (tránh trùng loại)
            builder.HasIndex(x => x.Name)
                   .IsUnique();

            // Relationship 1 - Many
            builder.HasMany(x => x.Locations)
                   .WithOne(x => x.LocationType)
                   .HasForeignKey(x => x.LocationTypeId)
                   .OnDelete(DeleteBehavior.Restrict);

            // Charset cho MySQL
            builder.HasCharSet("utf8mb4");
            builder.UseCollation("utf8mb4_unicode_ci");
        }
    }
}