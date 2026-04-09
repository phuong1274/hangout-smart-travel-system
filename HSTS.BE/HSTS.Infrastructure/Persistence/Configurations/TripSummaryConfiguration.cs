using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripSummaryConfiguration : IEntityTypeConfiguration<TripSummary>
    {
        public void Configure(EntityTypeBuilder<TripSummary> builder)
        {
            builder.ToTable("TripSummaries");
            builder.HasKey(x => x.Id);

            builder.HasOne(x => x.Trip)
                .WithOne(t => t.TripSummary)
                .HasForeignKey<TripSummary>(x => x.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.TripId).IsUnique();
        }
    }
}
