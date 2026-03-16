using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

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

            builder.Property(x => x.EnglishName)
                .HasMaxLength(200);

            builder.Property(x => x.Code)
                .HasMaxLength(50);

            builder.Property(x => x.Latitude)
                .HasPrecision(10, 8);

            builder.Property(x => x.Longitude)
                .HasPrecision(11, 8);

            builder.Property(x => x.Type);

            builder.HasOne(d => d.State)
                .WithMany(s => s.Destinations)
                .HasForeignKey(d => d.StateId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(d => d.Country)
                .WithMany(c => c.Destinations)
                .HasForeignKey(d => d.CountryId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
