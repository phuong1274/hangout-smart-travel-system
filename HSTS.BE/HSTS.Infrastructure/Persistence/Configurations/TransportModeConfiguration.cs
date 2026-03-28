using HSTS.Domain.Enums;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TransportModeConfiguration : IEntityTypeConfiguration<TransportMode>
    {
        public void Configure(EntityTypeBuilder<TransportMode> builder)
        {
            builder.ToTable("TransportModes");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Category)
                .HasConversion<int>()
                .HasDefaultValue(TransportCategory.Local);

            builder.Property(x => x.Name)
                .HasMaxLength(100)
                .IsRequired();

            builder.HasIndex(x => x.Name).IsUnique();
        }
    }
}