using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class TripAmenity : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TripAccommodationId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = null!;

        // Navigation properties
        public TripAccommodation TripAccommodation { get; set; } = null!;
    }
}
