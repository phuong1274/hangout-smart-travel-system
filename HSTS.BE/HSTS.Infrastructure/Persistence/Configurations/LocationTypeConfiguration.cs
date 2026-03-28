namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationTypeConfiguration : IEntityTypeConfiguration<LocationType>
    {
        public void Configure(EntityTypeBuilder<LocationType> builder)
        {
            builder.ToTable("LocationTypes");
            builder.HasKey(x => x.LocationTypeId);

            builder.Property(x => x.TypeName)
                .HasMaxLength(150)
                .IsRequired();

            builder.HasIndex(x => x.TypeName).IsUnique();
        }
    }
}