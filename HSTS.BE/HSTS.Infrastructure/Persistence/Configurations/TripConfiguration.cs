using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripConfiguration : IEntityTypeConfiguration<Trip>
    {
        public void Configure(EntityTypeBuilder<Trip> builder)
        {
            builder.ToTable("Trips");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.TripName).HasMaxLength(200).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(2000);
            builder.Property(x => x.StartingLocation).HasMaxLength(50);
            builder.Property(x => x.Currency).HasMaxLength(10).IsRequired().HasDefaultValue("VND");

            builder.HasOne(x => x.Profile)
                .WithMany()
                .HasForeignKey(x => x.ProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.TripSummary)
                .WithOne()
                .HasForeignKey<TripSummary>(x => x.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.ProfileId);
            builder.HasIndex(x => x.Status);
        }
    }
}
