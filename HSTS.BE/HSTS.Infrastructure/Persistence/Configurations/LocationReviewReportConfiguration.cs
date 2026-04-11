using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationReviewReportConfiguration : IEntityTypeConfiguration<LocationReviewReport>
    {
        public void Configure(EntityTypeBuilder<LocationReviewReport> builder)
        {
            builder.ToTable("LocationReviewReports");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Reason).HasConversion<int>().IsRequired();
            builder.Property(x => x.Status).HasConversion<int>().IsRequired();
            builder.Property(x => x.Description).HasMaxLength(1000);
            builder.Property(x => x.ResolutionNote).HasMaxLength(1000);

            builder.HasOne(x => x.LocationReview)
                .WithMany(r => r.Reports)
                .HasForeignKey(x => x.LocationReviewId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Reporter)
                .WithMany()
                .HasForeignKey(x => x.ReporterUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(x => new { x.LocationReviewId, x.ReporterUserId })
                .IsUnique()
                .HasFilter("`IsDeleted` = 0");

            builder.HasIndex(x => x.Status);
        }
    }
}
