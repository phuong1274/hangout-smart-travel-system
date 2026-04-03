using HSTS.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripActivity : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TripDayId { get; set; }

        [Required]
        public ActivityType Type { get; set; }

        [Required]
        [MaxLength(50)]
        public string Time { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string TimeBlock { get; set; } = null!;

        [Required]
        [MaxLength(1000)]
        public string Description { get; set; } = null!;

        [MaxLength(100)]
        public string? LocationReference { get; set; }

        public int? LocationId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? AccommodationCost { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TicketCost { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ExtraSpendingCost { get; set; }

        public bool? GroupDiscountApplied { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? LuggageStorageCost { get; set; }

        public TimeSpan? CheckInTime { get; set; }

        public TimeSpan? CheckOutTime { get; set; }

        // Navigation properties
        public TripDay TripDay { get; set; } = null!;
        public Location? Location { get; set; }
        public TripTransport? Transport { get; set; }
        public TripAccommodation? Accommodation { get; set; }
    }
}
