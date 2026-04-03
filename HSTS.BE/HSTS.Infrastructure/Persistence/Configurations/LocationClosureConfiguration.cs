namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationClosureConfiguration : IEntityTypeConfiguration<LocationClosure>
    {
        public void Configure(EntityTypeBuilder<LocationClosure> builder)
        {
            builder.ToTable("LocationClosure");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.StartDate)
                .IsRequired();

            builder.Property(x => x.EndDate)
                .IsRequired();

            builder.Property(x => x.Reason)
                .HasMaxLength(500);

            builder.Property(x => x.IsActive)
                .HasDefaultValue(true);

            builder.HasOne(x => x.Location)
                .WithMany(x => x.LocationClosures)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
