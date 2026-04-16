using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TripInvitationConfiguration : IEntityTypeConfiguration<TripInvitation>
    {
        public void Configure(EntityTypeBuilder<TripInvitation> builder)
        {
            builder.ToTable("TripInvitations");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Token)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Status)
                .HasConversion<int>();

            builder.Property(x => x.ExpirationDate)
                .IsRequired();

            // Unique token index
            builder.HasIndex(x => x.Token).IsUnique();

            // Composite index to prevent duplicate pending invites (application-enforced for MySQL)
            builder.HasIndex(x => new { x.TripId, x.InviteeId, x.Status });

            // Relationships
            builder.HasOne(x => x.Trip)
                .WithMany(t => t.TripInvitations)
                .HasForeignKey(x => x.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Inviter)
                .WithMany(u => u.SentInvitations)
                .HasForeignKey(x => x.InviterId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Invitee)
                .WithMany(u => u.ReceivedInvitations)
                .HasForeignKey(x => x.InviteeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
