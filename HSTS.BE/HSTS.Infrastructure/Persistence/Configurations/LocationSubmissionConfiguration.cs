using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationSubmissionConfiguration : IEntityTypeConfiguration<LocationSubmission>
    {
        public void Configure(EntityTypeBuilder<LocationSubmission> builder)
        {
            builder.ToTable("LocationSubmissions");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(2000)
                .IsRequired(false);

            builder.Property(x => x.Latitude)
                .IsRequired();

            builder.Property(x => x.Longitude)
                .IsRequired();

            builder.Property(x => x.Address)
                .HasMaxLength(300)
                .IsRequired();

            builder.Property(x => x.Telephone)
                .HasMaxLength(50)
                .IsRequired(false);

            builder.Property(x => x.Email)
                .HasMaxLength(200)
                .IsRequired(false);

            builder.Property(x => x.PriceMinUsd)
                .HasColumnType("decimal(18,2)")
                .IsRequired(false);

            builder.Property(x => x.PriceMaxUsd)
                .HasColumnType("decimal(18,2)")
                .IsRequired(false);

            builder.Property(x => x.UserId)
                .IsRequired();

            builder.Property(x => x.MediaLinksJson)
                .HasMaxLength(4000)
                .IsRequired(false);

            builder.Property(x => x.SocialLinksJson)
                .HasMaxLength(4000)
                .IsRequired(false);

            builder.Property(x => x.AmenityIdsJson)
                .HasMaxLength(1000)
                .IsRequired(false);

            builder.Property(x => x.RejectionReason)
                .HasMaxLength(500)
                .IsRequired(false);

            builder.Property(x => x.ReviewedBy)
                .HasMaxLength(450)
                .IsRequired(false);

            builder.Property(x => x.Status)
                .IsRequired();

            // Configure relationship with Destination
            builder.HasOne(s => s.Destination)
                   .WithMany()
                   .HasForeignKey(s => s.DestinationId)
                   .OnDelete(DeleteBehavior.SetNull);

            // Configure relationship with LocationType
            builder.HasOne(s => s.LocationType)
                   .WithMany()
                   .HasForeignKey(s => s.LocationTypeId)
                   .OnDelete(DeleteBehavior.SetNull);

            // Configure relationship with User (AspNetUsers)
            builder.HasOne(s => s.User)
                   .WithMany()
                   .HasForeignKey(s => s.UserId)
                   .OnDelete(DeleteBehavior.Cascade);

            // Configure relationship with created Location
            builder.HasOne(s => s.CreatedLocation)
                   .WithMany()
                   .HasForeignKey(s => s.CreatedLocationId)
                   .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
