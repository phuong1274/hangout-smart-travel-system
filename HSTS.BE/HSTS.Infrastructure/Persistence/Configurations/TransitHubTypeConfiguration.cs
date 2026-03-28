namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TransitHubTypeConfiguration : IEntityTypeConfiguration<TransitHubType>
    {
        public void Configure(EntityTypeBuilder<TransitHubType> builder)
        {
            builder.ToTable("TransitHubTypes");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.TypeName)
                .HasMaxLength(80)
                .IsRequired();

            builder.HasIndex(x => x.TypeName).IsUnique();
        }
    }
}