using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class LocationSeasonConfiguration : IEntityTypeConfiguration<LocationSeason>
    {
        public void Configure(EntityTypeBuilder<LocationSeason> builder)
        {
            builder.ToTable("LocationSeasons");
            builder.HasKey(x => x.Id);

            builder.HasOne(x => x.Location)
                   .WithMany(l => l.Seasons)
                   .HasForeignKey(x => x.LocationId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.Property(x => x.Description).HasMaxLength(1000);
            builder.Property(x => x.Months).HasMaxLength(100).IsRequired();

            builder.HasIndex(x => x.LocationId);
        }
    }
}
