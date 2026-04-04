using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class District : BaseEntity
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        [MaxLength(200)]
        public string? EnglishName { get; set; }

        [Range(-90, 90)]
        public double? Latitude { get; set; }

        [Range(-180, 180)]
        public double? Longitude { get; set; }

        [ForeignKey(nameof(Province))]
        public int? ProvinceId { get; set; }
        public Province? Province { get; set; }

        public ICollection<Location> Locations { get; set; } = new List<Location>();
        public ICollection<TransitHubs> TransitHubs { get; set; } = new List<TransitHubs>();
    }
}
