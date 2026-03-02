using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class LocationMedia : BaseEntity
    {
        [Required]
        public int Id { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Link { get; set; }

        [Required]
        public int LocationId { get; set; }

        public Location Location { get; set; }
    }
}
