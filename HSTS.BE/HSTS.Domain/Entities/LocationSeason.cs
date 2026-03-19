namespace HSTS.Domain.Entities
{
    public class LocationSeason : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public Location? Location { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Months { get; set; } = string.Empty;  // Comma-separated: "1,2,3,12"
    }
}
