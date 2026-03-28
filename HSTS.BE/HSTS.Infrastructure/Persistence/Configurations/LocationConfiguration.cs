namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationConfiguration : IEntityTypeConfiguration<Location>
    {
        public void Configure(EntityTypeBuilder<Location> builder)
        {
            builder.ToTable("Locations");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Code)
                .HasMaxLength(40);

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(2000);

            builder.Property(x => x.Longitude)
                .HasPrecision(10, 7);

            builder.Property(x => x.Latitude)
                .HasPrecision(10, 7);

            builder.Property(x => x.AverageBudget)
                .HasPrecision(18, 2);

            builder.Property(x => x.AverageStayDurationMinutes)
                .HasDefaultValue(60);

            builder.Property(x => x.OpenTime)
                .HasColumnType("time");

            builder.Property(x => x.CloseTime)
                .HasColumnType("time");

            builder.HasIndex(x => x.Code).IsUnique().HasFilter("Code IS NOT NULL");
            builder.HasIndex(x => x.Name);
            builder.HasIndex(x => new { x.ProvinceId, x.DistrictId });

            builder.HasOne(x => x.Province)
                .WithMany(x => x.Locations)
                .HasForeignKey(x => x.ProvinceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.District)
                .WithMany(x => x.Locations)
                .HasForeignKey(x => x.DistrictId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}