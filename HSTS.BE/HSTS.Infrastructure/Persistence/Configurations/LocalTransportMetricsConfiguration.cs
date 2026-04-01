namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocalTransportMetricsConfiguration : IEntityTypeConfiguration<LocalTransportMetrics>
    {
        public void Configure(EntityTypeBuilder<LocalTransportMetrics> builder)
        {
            builder.ToTable("LocalTransportMetrics");
            builder.HasKey(x => x.TransportationId);

            builder.Property(x => x.CostPerKm)
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
