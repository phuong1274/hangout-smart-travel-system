using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class CountryConfiguration : IEntityTypeConfiguration<Country>
    {
        public void Configure(EntityTypeBuilder<Country> builder)
        {
            builder.ToTable("Countries");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasMaxLength(50);

            builder.Property(x => x.Name)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Code)
                .HasMaxLength(10);

            builder.HasMany(x => x.States)
                .WithOne(s => s.Country)
                .HasForeignKey(s => s.CountryId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(x => x.Destinations)
                .WithOne(d => d.Country)
                .HasForeignKey(d => d.CountryId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
