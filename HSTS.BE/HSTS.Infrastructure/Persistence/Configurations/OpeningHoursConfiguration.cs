namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class OpeningHoursConfiguration : IEntityTypeConfiguration<OpeningHours>
    {
        public void Configure(EntityTypeBuilder<OpeningHours> builder)
        {
            builder.ToTable("OpeningHours");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.DayOfWeek)
                .IsRequired();

            builder.Property(x => x.OpenTime)
                .HasColumnType("time")
                .IsRequired();

            builder.Property(x => x.CloseTime)
                .HasColumnType("time")
                .IsRequired();

            builder.Property(x => x.Note)
                .HasMaxLength(500);

            builder.HasOne(x => x.Location)
                .WithMany(x => x.OpeningHours)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => new { x.LocationId, x.DayOfWeek });
        }
    }
}