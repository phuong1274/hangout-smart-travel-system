namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TransportModeConfiguration : IEntityTypeConfiguration<TransportMode>
    {
        public void Configure(EntityTypeBuilder<TransportMode> builder)
        {
            builder.ToTable("TransportModes");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Category)
                .HasConversion<int>();

            builder.HasOne(x => x.LocalTransportMetrics)
                .WithOne(x => x.TransportMode)
                .HasForeignKey<LocalTransportMetrics>(x => x.TransportationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(x => x.TransitHubs)
                .WithOne(x => x.TransportMode)
                .HasForeignKey(x => x.TransportationId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
