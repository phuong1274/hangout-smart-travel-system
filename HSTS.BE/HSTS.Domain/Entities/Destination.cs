using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class Destination : BaseEntity
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        [MaxLength(200)]
        public string? EnglishName { get; set; }

        [MaxLength(50)]
        public string? Code { get; set; }

        [Range(-90, 90)]
        public double? Latitude { get; set; }

        [Range(-180, 180)]
        public double? Longitude { get; set; }

        [ForeignKey(nameof(State))]
        public int? StateId { get; set; }
        public State? State { get; set; }

        [MaxLength(50)]
        [ForeignKey(nameof(Country))]
        public string? CountryId { get; set; }
        public Country? Country { get; set; }

        public ICollection<Location> Locations { get; set; } = new List<Location>();
    }
}
