namespace HSTS.Domain.Entities
{
    public class LocationMedia : BaseEntity
    {
        public int MediaId { get; set; }
        public int LocationId { get; set; }
        public string Link { get; set; } = null!;

        public Location Location { get; set; } = null!;
    }
}