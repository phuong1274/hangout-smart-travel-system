namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TransitHubConfiguration : IEntityTypeConfiguration<TransitHub>
    {
        public void Configure(EntityTypeBuilder<TransitHub> builder)
        {
            builder.ToTable("TransitHubs");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Code)
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Longitude)
                .HasPrecision(10, 7);

            builder.Property(x => x.Latitude)
                .HasPrecision(10, 7);

            builder.HasIndex(x => x.Code).IsUnique();
            builder.HasIndex(x => x.ProvinceId);
            builder.HasIndex(x => x.DistrictId);

            builder.HasOne(x => x.Province)
                .WithMany(x => x.TransitHubs)
                .HasForeignKey(x => x.ProvinceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.District)
                .WithMany(x => x.TransitHubs)
                .HasForeignKey(x => x.DistrictId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(x => x.TransportMode)
                .WithMany(x => x.TransitHubs)
                .HasForeignKey(x => x.TransportModeId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.TransitHubType)
                .WithMany(x => x.TransitHubs)
                .HasForeignKey(x => x.TransitHubTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}