namespace HSTS.Domain.Entities
{
    public class Tag : BaseEntity
    {
        public int Id { get; set; }
        public int? TagParentId { get; set; }
        public string Title { get; set; } = null!;

        public Tag? ParentTag { get; set; }
        public ICollection<Tag> ChildTags { get; set; } = new List<Tag>();
        public ICollection<LocationTag> LocationTags { get; set; } = new List<LocationTag>();
    }
}