using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationReviewConfiguration : IEntityTypeConfiguration<LocationReview>
    {
        public void Configure(EntityTypeBuilder<LocationReview> builder)
        {
            builder.ToTable("LocationReviews");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Rating).IsRequired();
            builder.Property(x => x.Comment).HasMaxLength(2000).IsRequired();
            builder.Property(x => x.IsAnonymous).HasDefaultValue(false);
            builder.Property(x => x.Status).HasConversion<int>().IsRequired();
            builder.Property(x => x.ReportCount).HasDefaultValue(0);

            builder.HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(x => new { x.LocationId, x.UserId })
                .IsUnique()
                .HasFilter("`IsDeleted` = 0");

            builder.HasIndex(x => x.LocationId);
            builder.HasIndex(x => x.Status);
        }
    }
}
