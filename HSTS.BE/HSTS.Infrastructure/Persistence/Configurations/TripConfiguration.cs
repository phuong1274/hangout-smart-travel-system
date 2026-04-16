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

            builder.Property(x => x.TripName)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(2000);

            builder.Property(x => x.Currency)
                .HasMaxLength(10)
                .IsRequired();

            builder.Property(x => x.Status)
                .HasConversion<int>();

            builder.Ignore(t => t.StartingLocation);

            builder.HasMany(t => t.TripMembers)
                .WithOne(tm => tm.Trip)
                .HasForeignKey(tm => tm.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(t => t.TripDays)
                .WithOne(td => td.Trip)
                .HasForeignKey(td => td.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(t => t.TripInvitations)
                .WithOne(ti => ti.Trip)
                .HasForeignKey(ti => ti.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(t => t.TripSummary)
                .WithOne(ts => ts.Trip)
                .HasForeignKey<TripSummary>(ts => ts.TripId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
