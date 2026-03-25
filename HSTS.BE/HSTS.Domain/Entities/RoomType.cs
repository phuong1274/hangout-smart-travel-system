using System;
using System.Collections.Generic;

namespace HSTS.Domain.Entities
{
    public class RoomType : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public int MaxOccupancy { get; set; }
        public double PricePerNight { get; set; }
        public double PricePerHour { get; set; }
        public List<string> Amenities { get; set; } = new List<string>();

        // Navigation property
        public virtual Location Location { get; set; } = null!;
    }
}
