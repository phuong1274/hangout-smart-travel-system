using System;
using System.Collections.Generic;

namespace HSTS.Domain.Entities
{
    public class Location : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int AverageStayDuration { get; set; } // in minutes
        public double AverageBudget { get; set; }
        public int DistrictId { get; set; }
        public List<string> Tags { get; set; } = new List<string>();

        // Navigation properties
        public virtual District District { get; set; } = null!;
        public virtual ICollection<OpeningHours> OpeningHours { get; set; } = new List<OpeningHours>();
        public virtual ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();
    }
}
