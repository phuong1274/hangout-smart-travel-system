using System;
using System.Collections.Generic;

namespace HSTS.Domain.Entities
{
    public class Country : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string CountryCode { get; set; } = null!;

        // Navigation properties
        public virtual ICollection<Province> Provinces { get; set; } = new List<Province>();
    }
}
