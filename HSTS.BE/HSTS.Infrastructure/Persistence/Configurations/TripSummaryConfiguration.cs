using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripSummaryConfiguration : IEntityTypeConfiguration<TripSummary>
    {
        public void Configure(EntityTypeBuilder<TripSummary> builder)
        {
            builder.ToTable("TripSummaries");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.TotalBudget)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.UsableBudget)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.EstimatedAccommodationCost)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.EstimatedTransportCost)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.EstimatedActivityCost)
                .HasColumnType("decimal(18,2)");
            builder.Property(x => x.EstimatedMealCost)
               .HasColumnType("decimal(18,2)");
            builder.Property(x => x.EstimatedTotalCost)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.RemainingBudget)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.ContingencyFund)
                .HasColumnType("decimal(18,2)");
            builder.HasOne(ts => ts.Trip)
                .WithOne(t => t.TripSummary)
                .HasForeignKey<TripSummary>(ts => ts.TripId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
