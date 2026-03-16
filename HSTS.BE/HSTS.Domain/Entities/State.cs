using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class State : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        [MaxLength(50)]
        public string? Code { get; set; }

        [Required]
        [MaxLength(50)]
        [ForeignKey(nameof(Country))]
        public string CountryId { get; set; } = null!;
        public Country? Country { get; set; }

        public ICollection<Destination> Destinations { get; set; } = new List<Destination>();
    }
}
