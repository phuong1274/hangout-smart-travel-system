using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class Amenity : BaseEntity
    {
        [Required]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        [MaxLength(500)]
        public string? Description { get; set; }

        public ICollection<LocationAmenity> LocationAmenities { get; set; } = new List<LocationAmenity>();
    }
}
