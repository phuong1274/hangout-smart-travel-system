using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationConfiguration : IEntityTypeConfiguration<Location>
    {
        public void Configure(EntityTypeBuilder<Location> builder)
        {
            builder.ToTable("Locations");
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

            builder.Property(x => x.TicketPrice)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.MinimumAge)
                .IsRequired();

            builder.Property(x => x.Address)
                .HasMaxLength(300)
                .IsRequired();

            builder.Property(x => x.SocialLink)
                .HasMaxLength(500)
                .IsRequired(false);

            builder.Property(x => x.LocationTypeId)
                .IsRequired();

            // New fields
            builder.Property(x => x.Telephone)
                .HasMaxLength(50)
                .IsRequired(false);

            builder.Property(x => x.Email)
                .HasMaxLength(200)
                .IsRequired(false);

            builder.Property(x => x.Rating)
                .HasColumnType("decimal(3,2)")
                .IsRequired(false);

            builder.Property(x => x.ReviewCount)
                .IsRequired(false);

            builder.Property(x => x.PriceRange)
                .HasMaxLength(50)
                .IsRequired(false);

            builder.Property(x => x.PriceMinUsd)
                .HasColumnType("decimal(18,2)")
                .IsRequired(false);

            builder.Property(x => x.PriceMaxUsd)
                .HasColumnType("decimal(18,2)")
                .IsRequired(false);

            builder.Property(x => x.Source)
                .HasMaxLength(500)
                .IsRequired(false);

            builder.Property(x => x.SourceUrl)
                .HasMaxLength(2000)
                .IsRequired(false);

            builder.Property(x => x.RecommendedDurationMinutes)
                .IsRequired(false);

            // Configure relationship with LocationType
            builder.HasOne(l => l.LocationType)
                   .WithMany() // Assuming LocationType doesn't need a collection of Locations
                   .HasForeignKey(l => l.LocationTypeId);

            // Configure relationship with Destination
            builder.HasOne(l => l.Destination)
                   .WithMany(d => d.Locations)
                   .HasForeignKey(l => l.DestinationId);

            // Configure relationship with LocationTag
            builder.HasMany(l => l.LocationTags)
                   .WithOne(lt => lt.Location)
                   .HasForeignKey(lt => lt.LocationId);

            // Configure relationship with LocationMedia
            builder.HasMany(l => l.LocationMedias)
                   .WithOne(lm => lm.Location)
                   .HasForeignKey(lm => lm.LocationId);

            // Configure relationship with LocationAmenity
            builder.HasMany(l => l.LocationAmenities)
                   .WithOne(la => la.Location)
                   .HasForeignKey(la => la.LocationId);
        }
    }
}