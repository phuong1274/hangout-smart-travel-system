namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationMediaConfiguration : IEntityTypeConfiguration<LocationMedia>
    {
        public void Configure(EntityTypeBuilder<LocationMedia> builder)
        {
            builder.ToTable("LocationMedia");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Link)
                .HasMaxLength(1000)
                .IsRequired();

            builder.HasOne(x => x.Location)
                .WithMany(x => x.LocationMedias)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.LocationId);
        }
    }
}