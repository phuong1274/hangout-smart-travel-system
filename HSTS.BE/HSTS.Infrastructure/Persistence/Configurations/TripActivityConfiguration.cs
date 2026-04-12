using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripActivityConfiguration : IEntityTypeConfiguration<TripActivity>
    {
        public void Configure(EntityTypeBuilder<TripActivity> builder)
        {
            builder.ToTable("TripActivities");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Title)
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(x => x.Type)
                .HasConversion<int>();

            builder.HasOne(ta => ta.TripDay)
                .WithMany(td => td.Activities)
                .HasForeignKey(ta => ta.TripDayId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(ta => ta.Location)
                .WithMany()
                .HasForeignKey(ta => ta.LocationId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(ta => ta.CustomLocation)
                .WithMany(cl => cl.TripActivities)
                .HasForeignKey(ta => ta.CustomLocationId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(ta => ta.Transport)
                .WithOne(tt => tt.TripActivity)
                .HasForeignKey<TripTransport>(tt => tt.TripActivityId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(ta => ta.Budget)
                .WithOne(b => b.TripActivity)
                .HasForeignKey<TripActivityBudget>(b => b.TripActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
