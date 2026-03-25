using System;

namespace HSTS.Domain.Entities
{
    public class OpeningHours : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public TimeSpan OpenTime { get; set; }
        public TimeSpan CloseTime { get; set; }

        // Navigation property
        public virtual Location Location { get; set; } = null!;
    }
}
