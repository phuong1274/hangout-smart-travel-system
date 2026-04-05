using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class Hub : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        [Required]
        public int LocationId { get; set; }

        [MaxLength(50)]
        public string? HubType { get; set; } // e.g., "Airport", "TrainStation", "BusStation", "CityCenter"

        [Required]
        [Range(-90, 90)]
        public double Latitude { get; set; }

        [Required]
        [Range(-180, 180)]
        public double Longitude { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        // Navigation properties
        public Location Location { get; set; } = null!;
    }
}
