namespace HSTS.Domain.Entities
{
    public class SocialLinks : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public string Platform { get; set; } = null!;
        public string Url { get; set; } = null!;

        public Location Location { get; set; } = null!;
    }
}
