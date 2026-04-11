using HSTS.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripMember : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TripId { get; set; }

        public int? UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        [Required]
        public TripMemberRole Role { get; set; } = TripMemberRole.MEMBER;

        public Trip Trip { get; set; } = null!;
        public User? User { get; set; }
    }
}
