using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripMemberConfiguration : IEntityTypeConfiguration<TripMember>
    {
        public void Configure(EntityTypeBuilder<TripMember> builder)
        {
            builder.ToTable("TripMembers");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
            builder.Property(x => x.Role).IsRequired();

            builder.HasOne(x => x.Trip)
                .WithMany(t => t.TripMembers)
                .HasForeignKey(x => x.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasIndex(x => new { x.TripId, x.UserId });
        }
    }
}
