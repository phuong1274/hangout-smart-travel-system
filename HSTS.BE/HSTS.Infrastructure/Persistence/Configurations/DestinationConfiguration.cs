using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class DestinationConfiguration : IEntityTypeConfiguration<Destination>
    {
        public void Configure(EntityTypeBuilder<Destination> builder)
        {
            builder.ToTable("Destinations");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            // Configure relationship with Location
            builder.HasMany(d => d.Locations)
                   .WithOne(l => l.Destination)
                   .HasForeignKey(l => l.DestinationId)
                   .OnDelete(DeleteBehavior.Restrict); // Keep it Restrict for now to prevent accidental deletion

            // Charset MySQL
            builder.HasCharSet("utf8mb4");
            builder.UseCollation("utf8mb4_unicode_ci");
        }
    }
}
