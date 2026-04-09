using HSTS.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class Trip : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string TripName { get; set; } = null!;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Required]
        public int ProfileId { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        [MaxLength(50)]
        public string? StartingLocation { get; set; }

        public TripStatus Status { get; set; } = TripStatus.Planned;

        [Required]
        [MaxLength(10)]
        public string Currency { get; set; } = "VND";

        // Navigation properties
        public Profile Profile { get; set; } = null!;
        public ICollection<TripDay> TripDays { get; set; } = new List<TripDay>();
        public ICollection<TripMember> TripMembers { get; set; } = new List<TripMember>();
        public TripSummary? TripSummary { get; set; }
    }
}
