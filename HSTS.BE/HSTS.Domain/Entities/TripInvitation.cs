using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class TripInvitation : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TripId { get; set; }

        [Required]
        public int InviterId { get; set; }

        [Required]
        public int InviteeId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Token { get; set; } = null!;

        [Required]
        public DateTime ExpirationDate { get; set; }

        public InvitationStatus Status { get; set; } = InvitationStatus.Pending;

        // Navigation properties
        public Trip Trip { get; set; } = null!;

        [ForeignKey("InviterId")]
        public User Inviter { get; set; } = null!;

        [ForeignKey("InviteeId")]
        public User Invitee { get; set; } = null!;
    }
}
