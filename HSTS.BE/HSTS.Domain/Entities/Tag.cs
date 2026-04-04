using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class Tag : BaseEntity
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = null!;

        // Hierarchical tag support
        public int? ParentTagId { get; set; }
        public Tag? ParentTag { get; set; }
        
        public int Level { get; set; } = 1; // 1 = Root, 2 = Child, 3 = Grandchild
        
        public ICollection<Tag> ChildTags { get; set; } = new List<Tag>();
        public ICollection<LocationTag> LocationTags { get; set; } = new List<LocationTag>();
    }
}
