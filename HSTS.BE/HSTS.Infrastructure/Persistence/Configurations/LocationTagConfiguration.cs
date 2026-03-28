namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationTagConfiguration : IEntityTypeConfiguration<LocationTag>
    {
        public void Configure(EntityTypeBuilder<LocationTag> builder)
        {
            builder.ToTable("LocationTags");
            builder.HasKey(x => new { x.LocationId, x.TagId });

            builder.HasOne(x => x.Location)
                .WithMany(x => x.LocationTags)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Tag)
                .WithMany(x => x.LocationTags)
                .HasForeignKey(x => x.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}