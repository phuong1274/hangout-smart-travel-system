namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class RoomTypeConfiguration : IEntityTypeConfiguration<RoomType>
    {
        public void Configure(EntityTypeBuilder<RoomType> builder)
        {
            builder.ToTable("RoomTypes");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(120)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(1000);

            builder.Property(x => x.PricePerNight)
                .HasPrecision(18, 2);

            builder.Property(x => x.PricePerHour)
                .HasPrecision(18, 2);

            builder.Property(x => x.AmenitiesJson)
                .HasColumnType("longtext");

            builder.HasIndex(x => x.LocationId);

            builder.HasOne(x => x.Location)
                .WithMany(x => x.RoomTypes)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}