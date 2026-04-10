using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripTransportConfiguration : IEntityTypeConfiguration<TripTransport>
    {
        public void Configure(EntityTypeBuilder<TripTransport> builder)
        {
            builder.ToTable("TripTransports");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.DistanceKm)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.TotalCost)
                .HasColumnType("decimal(18,2)");

            builder.HasOne(tt => tt.TripActivity)
                .WithOne(a => a.Transport)
                .HasForeignKey<TripTransport>(tt => tt.TripActivityId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(tt => tt.TransportMode)
                .WithMany()
                .HasForeignKey(tt => tt.TransportModeId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(tt => tt.FromTransitHub)
                .WithMany()
                .HasForeignKey(tt => tt.FromTransitHubId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(tt => tt.ToTransitHub)
                .WithMany()
                .HasForeignKey(tt => tt.ToTransitHubId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(tt => tt.CustomFromTransitHub)
                .WithMany(cth => cth.FromTransitHubTransports)
                .HasForeignKey(tt => tt.CustomFromTransitHubId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(tt => tt.CustomToTransitHub)
                .WithMany(cth => cth.ToTransitHubTransports)
                .HasForeignKey(tt => tt.CustomToTransitHubId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(tt => tt.FromLocation)
                .WithMany()
                .HasForeignKey(tt => tt.FromLocationId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(tt => tt.ToLocation)
                .WithMany()
                .HasForeignKey(tt => tt.ToLocationId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
