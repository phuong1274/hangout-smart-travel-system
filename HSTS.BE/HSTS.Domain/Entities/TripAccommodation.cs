using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripAccommodation : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TripActivityId { get; set; }

        [MaxLength(100)]
        public string? LocationReference { get; set; }

        public int? LocationId { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? PricePerNight { get; set; }

        public int? MaxOccupancy { get; set; }

        public int? RoomsNeeded { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalCost { get; set; }

        public bool Recommended { get; set; }

        [MaxLength(1000)]
        public string? Pros { get; set; }

        [MaxLength(1000)]
        public string? Cons { get; set; }

        // Navigation properties
        public TripActivity TripActivity { get; set; } = null!;
        public Location? Location { get; set; }
        public ICollection<TripAmenity> Amenities { get; set; } = new List<TripAmenity>();
    }
}
