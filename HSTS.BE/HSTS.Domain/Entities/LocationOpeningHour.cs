namespace HSTS.Domain.Entities
{
    public class LocationOpeningHour : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public Location? Location { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public TimeSpan? OpenTime { get; set; }
        public TimeSpan? CloseTime { get; set; }
        public bool IsClosed { get; set; }
        public string? Note { get; set; }
    }
}
