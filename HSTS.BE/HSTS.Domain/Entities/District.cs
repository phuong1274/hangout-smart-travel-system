using System;
using System.Collections.Generic;

namespace HSTS.Domain.Entities
{
    public class District : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Type { get; set; } = null!;
        public int ProvinceId { get; set; }

        // Navigation properties
        public virtual Province Province { get; set; } = null!;
        public virtual ICollection<Location> Locations { get; set; } = new List<Location>();
    }
}
