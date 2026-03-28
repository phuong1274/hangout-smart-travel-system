namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationConfiguration : IEntityTypeConfiguration<Location>
    {
        public void Configure(EntityTypeBuilder<Location> builder)
        {
            builder.ToTable("Locations");
            builder.HasKey(x => x.LocationId);

            builder.Property(x => x.LocationName)
                .HasMaxLength(250)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(2000);

            builder.Property(x => x.TicketPrice)
                .HasPrecision(18, 2);

            builder.Property(x => x.PriceMin)
                .HasPrecision(18, 2);

            builder.Property(x => x.PriceMax)
                .HasPrecision(18, 2);

            builder.Property(x => x.Score)
                .HasPrecision(6, 2);

            builder.Property(x => x.Address)
                .HasMaxLength(500);

            builder.Property(x => x.PhoneNumer)
                .HasMaxLength(30);

            builder.Property(x => x.Email)
                .HasMaxLength(150);

            builder.Property(x => x.Source)
                .HasMaxLength(120);

            builder.Property(x => x.SourceUrl)
                .HasMaxLength(500);

            builder.Property(x => x.Longitude)
                .HasPrecision(10, 7);

            builder.Property(x => x.Latitude)
                .HasPrecision(10, 7);

            builder.Property(x => x.RecommentDurations)
                .HasDefaultValue(60);

            builder.HasIndex(x => x.LocationName);
            builder.HasIndex(x => new { x.ProvinceId, x.DistrictId });
            builder.HasIndex(x => x.LocationTypeId);

            builder.HasOne(x => x.Province)
                .WithMany(x => x.Locations)
                .HasForeignKey(x => x.ProvinceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.District)
                .WithMany(x => x.Locations)
                .HasForeignKey(x => x.DistrictId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(x => x.LocationType)
                .WithMany(x => x.Locations)
                .HasForeignKey(x => x.LocationTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}