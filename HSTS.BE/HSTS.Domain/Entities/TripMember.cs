using HSTS.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    /// <summary>
    /// Junction table between Trip and User with role-based permissions.
    /// Tracks which users are members of which trips and their roles.
    /// </summary>
    public class TripMember : BaseEntity
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("TripId")]
        public int TripId { get; set; }

        [Required]
        [Column("UserId")]
        public int UserId { get; set; }

        [Required]
        [Column("Role")]
        public TripRole Role { get; set; }

        [Column("JoinedDate")]
        public DateTime JoinedDate { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Trip Trip { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
