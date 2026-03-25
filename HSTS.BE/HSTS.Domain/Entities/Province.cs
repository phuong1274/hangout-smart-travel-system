using System;
using System.Collections.Generic;

namespace HSTS.Domain.Entities
{
    public class Province : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string EnglishName { get; set; } = null!;
        public string ProvinceCode { get; set; } = null!;
        public string Type { get; set; } = null!; // City/Province
        public int CountryId { get; set; }

        // Navigation properties
        public virtual Country Country { get; set; } = null!;
        public virtual ICollection<District> Districts { get; set; } = new List<District>();
    }
}
