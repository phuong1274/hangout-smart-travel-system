namespace HSTS.Domain.Entities
{
    public class LocationTag
    {
        public int LocationId { get; set; }
        public int TagId { get; set; }

        public Location Location { get; set; } = null!;
        public Tag Tag { get; set; } = null!;
    }
}