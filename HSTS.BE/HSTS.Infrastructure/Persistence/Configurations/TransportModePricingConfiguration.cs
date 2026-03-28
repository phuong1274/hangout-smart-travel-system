namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TransportModePricingConfiguration : IEntityTypeConfiguration<TransportModePricing>
    {
        public void Configure(EntityTypeBuilder<TransportModePricing> builder)
        {
            builder.ToTable("TransportModePricings");
            builder.HasKey(x => x.TransportModeId);

            builder.Property(x => x.CostPerKm)
                .HasPrecision(18, 2);

            builder.HasOne(x => x.TransportMode)
                .WithOne(x => x.Pricing)
                .HasForeignKey<TransportModePricing>(x => x.TransportModeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}