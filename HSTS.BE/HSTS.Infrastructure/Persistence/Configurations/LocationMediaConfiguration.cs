namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationMediaConfiguration : IEntityTypeConfiguration<LocationMedia>
    {
        public void Configure(EntityTypeBuilder<LocationMedia> builder)
        {
            builder.ToTable("LocationMedia");
            builder.HasKey(x => x.MediaId);

            builder.Property(x => x.Link)
                .HasMaxLength(500)
                .IsRequired();

            builder.HasIndex(x => x.LocationId);

            builder.HasOne(x => x.Location)
                .WithMany(x => x.LocationMedias)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}