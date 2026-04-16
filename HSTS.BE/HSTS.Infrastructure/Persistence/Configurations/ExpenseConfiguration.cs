using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
    {
        public void Configure(EntityTypeBuilder<Expense> builder)
        {
            builder.ToTable("Expenses");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(1000);
            builder.Property(x => x.TotalAmount).HasColumnType("decimal(18,2)").IsRequired();

            builder.HasOne(x => x.TripActivity)
                .WithMany()
                .HasForeignKey(x => x.TripActivityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(x => x.TripActivityId);
        }
    }
}
