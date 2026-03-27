using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations;

public class AirportInfoConfiguration : IEntityTypeConfiguration<AirportInfo>
{
    public void Configure(EntityTypeBuilder<AirportInfo> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.IataCode).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Latitude).HasPrecision(18, 10);
        builder.Property(x => x.Longitude).HasPrecision(18, 10);
        
        builder.HasOne(x => x.Province)
               .WithMany()
               .HasForeignKey(x => x.ProvinceId);
    }
}
