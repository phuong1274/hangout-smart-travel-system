using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class Province : BaseEntity
    {
        [Key]
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

        [Required]
        [MaxLength(50)]
        [ForeignKey(nameof(Country))]
        public string CountryId { get; set; } = null!;
        public Country? Country { get; set; }

        public ICollection<District> Districts { get; set; } = new List<District>();
    }
}
