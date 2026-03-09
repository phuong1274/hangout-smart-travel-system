using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class Tag : BaseEntity
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = null!;

        public ICollection<LocationTag> LocationTags { get; set; } = new List<LocationTag>();
    }
}
