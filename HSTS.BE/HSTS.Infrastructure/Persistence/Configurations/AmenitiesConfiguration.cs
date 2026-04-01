namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class AmenitiesConfiguration : IEntityTypeConfiguration<Amenities>
    {
        public void Configure(EntityTypeBuilder<Amenities> builder)
        {
            builder.ToTable("Amenities");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();
        }
    }
}