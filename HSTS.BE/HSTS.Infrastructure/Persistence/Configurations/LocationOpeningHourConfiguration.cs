using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationOpeningHourConfiguration : IEntityTypeConfiguration<LocationOpeningHour>
    {
        public void Configure(EntityTypeBuilder<LocationOpeningHour> builder)
        {
            builder.ToTable("LocationOpeningHours");
            builder.HasKey(x => x.Id);

            builder.HasOne(x => x.Location)
                   .WithMany(l => l.OpeningHours)
                   .HasForeignKey(x => x.LocationId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.Property(x => x.DayOfWeek).IsRequired();
            builder.Property(x => x.IsClosed).HasDefaultValue(false);
            builder.Property(x => x.Note).HasMaxLength(500);

            builder.HasIndex(x => new { x.LocationId, x.DayOfWeek });
        }
    }
}
