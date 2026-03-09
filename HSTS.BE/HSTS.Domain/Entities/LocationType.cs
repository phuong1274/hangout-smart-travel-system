using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class LocationType : BaseEntity
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        public ICollection<Location> Locations { get; set; } = new List<Location>();
    }
}
