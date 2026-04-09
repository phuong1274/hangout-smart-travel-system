using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripDayConfiguration : IEntityTypeConfiguration<TripDay>
    {
        public void Configure(EntityTypeBuilder<TripDay> builder)
        {
            builder.ToTable("TripDays");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.DayTitle)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.WeatherSummary)
                .HasMaxLength(200);

            builder.Property(x => x.EstimateCost)
                .HasColumnType("decimal(18,2)");

            builder.HasOne(td => td.Trip)
                .WithMany(t => t.TripDays)
                .HasForeignKey(td => td.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(td => td.Activities)
                .WithOne(a => a.TripDay)
                .HasForeignKey(a => a.TripDayId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
