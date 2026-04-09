using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripActivityConfiguration : IEntityTypeConfiguration<TripActivity>
    {
        public void Configure(EntityTypeBuilder<TripActivity> builder)
        {
            builder.ToTable("TripActivities");
            builder.HasKey(x => x.Id);

            builder.HasOne(x => x.TripDay)
                .WithMany(td => td.Activities)
                .HasForeignKey(x => x.TripDayId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasIndex(x => x.TripDayId);
            builder.HasIndex(x => x.LocationId);
        }
    }
}
