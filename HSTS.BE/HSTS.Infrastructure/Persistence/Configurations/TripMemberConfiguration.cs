using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripMemberConfiguration : IEntityTypeConfiguration<TripMember>
    {
        public void Configure(EntityTypeBuilder<TripMember> builder)
        {
            builder.ToTable("TripMembers");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Role)
                .HasConversion<int>();

            builder.Property(x => x.JoinedDate)
                .IsRequired();

            builder.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(200);

            // Configure relationships
            builder.HasOne(tm => tm.Trip)
                .WithMany(t => t.TripMembers)
                .HasForeignKey(tm => tm.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(tm => tm.User)
                .WithMany(u => u.TripMembers)
                .HasForeignKey(tm => tm.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Index (UserId can be null for non-user members)
            builder.HasIndex(tm => tm.TripId);
            builder.HasIndex(tm => tm.UserId);
        }
    }
}
