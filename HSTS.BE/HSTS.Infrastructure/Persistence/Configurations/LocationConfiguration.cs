namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationConfiguration : IEntityTypeConfiguration<Location>
    {
        public void Configure(EntityTypeBuilder<Location> builder)
        {
            builder.ToTable("Location");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(2000);

            builder.Property(x => x.Address)
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(x => x.PhoneNumber)
                .HasMaxLength(30);

            builder.Property(x => x.Email)
                .HasMaxLength(150);

            builder.Property(x => x.Source)
                .HasMaxLength(100);

            builder.Property(x => x.SourceUrl)
                .HasMaxLength(500);

            builder.Property(x => x.Score)
                .HasPrecision(5, 2);

            builder.Property(x => x.Status)
                .HasDefaultValue(LocationStatus.Active)
                .HasConversion<int>();

            builder.HasOne(x => x.Province)
                .WithMany(x => x.Locations)
                .HasForeignKey(x => x.ProvinceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.District)
                .WithMany(x => x.Locations)
                .HasForeignKey(x => x.DistrictId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.LocationType)
                .WithMany(x => x.Locations)
                .HasForeignKey(x => x.LocationTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(x => x.Amenities)
                .WithMany(x => x.Locations)
                .UsingEntity<Dictionary<string, object>>(
                    "LocationAmenities",
                    right => right.HasOne<Amenities>()
                        .WithMany()
                        .HasForeignKey("AmenitiesId")
                        .OnDelete(DeleteBehavior.Cascade),
                    left => left.HasOne<Location>()
                        .WithMany()
                        .HasForeignKey("LocationId")
                        .OnDelete(DeleteBehavior.Cascade),
                    join =>
                    {
                        join.ToTable("LocationAmenities");
                        join.HasKey("LocationId", "AmenitiesId");
                    });

            builder.HasMany(x => x.Tags)
                .WithMany(x => x.Locations)
                .UsingEntity<Dictionary<string, object>>(
                    "LocationTags",
                    right => right.HasOne<Tag>()
                        .WithMany()
                        .HasForeignKey("TagId")
                        .OnDelete(DeleteBehavior.Cascade),
                    left => left.HasOne<Location>()
                        .WithMany()
                        .HasForeignKey("LocationId")
                        .OnDelete(DeleteBehavior.Cascade),
                    join =>
                    {
                        join.ToTable("LocationTags");
                        join.HasKey("LocationId", "TagId");
                    });

            builder.HasMany(x => x.OpeningHours)
                .WithOne(x => x.Location)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(x => x.SocialLinks)
                .WithOne(x => x.Location)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(x => x.LocationMedias)
                .WithOne(x => x.Location)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
