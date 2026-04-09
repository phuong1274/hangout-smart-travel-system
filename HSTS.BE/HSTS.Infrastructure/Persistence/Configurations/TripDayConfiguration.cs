using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripDayConfiguration : IEntityTypeConfiguration<TripDay>
    {
        public void Configure(EntityTypeBuilder<TripDay> builder)
        {
            builder.ToTable("TripDays");
            builder.HasKey(x => x.Id);

            builder.HasOne(x => x.Trip)
                .WithMany(t => t.TripDays)
                .HasForeignKey(x => x.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.TripId);
        }
    }
}
