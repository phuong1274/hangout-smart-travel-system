namespace HSTS.Domain.Entities
{
    public class OpeningHours : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public int DayOfWeek { get; set; }
        public TimeSpan OpenTime { get; set; }
        public TimeSpan CloseTime { get; set; }
        public string? Note { get; set; }

        public Location Location { get; set; } = null!;
    }
}
