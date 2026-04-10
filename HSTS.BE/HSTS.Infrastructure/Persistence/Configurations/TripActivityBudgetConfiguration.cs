using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripActivityBudgetConfiguration : IEntityTypeConfiguration<TripActivityBudget>
    {
        public void Configure(EntityTypeBuilder<TripActivityBudget> builder)
        {
            builder.ToTable("TripActivityBudgets");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.EstimateCost)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.Title)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(500);

            builder.Property(x => x.ActualExpense)
                .HasColumnType("decimal(18,2)");

            builder.HasOne(b => b.TripActivity)
                .WithOne(a => a.Budget)
                .HasForeignKey<TripActivityBudget>(b => b.TripActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
