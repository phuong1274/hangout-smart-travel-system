using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class LocationAmenity : BaseEntity
    {
        [Required]
        public int LocationId { get; set; }

        [Required]
        public int AmenityId { get; set; }

        public Location Location { get; set; }

        public Amenity Amenity { get; set; }
    }
}
