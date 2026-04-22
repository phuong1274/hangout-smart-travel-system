namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocalTransportMetricsConfiguration : IEntityTypeConfiguration<LocalTransportMetrics>
    {
        public void Configure(EntityTypeBuilder<LocalTransportMetrics> builder)
        {
            builder.ToTable("LocalTransportMetrics");
            builder.HasKey(x => x.TransportationId);

            builder.Property(x => x.BaseFare)
                .HasPrecision(18, 2)
                .IsRequired();

            builder.Property(x => x.BaseDistance)
                .HasPrecision(18, 2)
                .IsRequired();

            builder.Property(x => x.PricePerKm)
                .HasPrecision(18, 2)
                .IsRequired();

            builder.Property(x => x.LongDistanceThreshold)
                .HasPrecision(18, 2);

            builder.Property(x => x.LongDistancePricePerKm)
                .HasPrecision(18, 2);

            builder.Property(x => x.CongestionFeePerMinute)
                .HasPrecision(18, 2)
                .IsRequired();

            builder.Property(x => x.SpeedKmh)
                .HasPrecision(18, 2)
                .IsRequired();

            builder.Property(x => x.MaxRecommendedDistance)
                .HasPrecision(18, 2);
        }
    }
}
