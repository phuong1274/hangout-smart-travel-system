using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class Province : BaseEntity
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public int CountryId { get; set; }
        public string Name { get; set; } = null!;
        public double Longitude { get; set; }
        public double Latitude { get; set; }

        // Navigation properties
        public Country Country { get; set; } = null!;
        public ICollection<District> Districts { get; set; } = new List<District>();
        public ICollection<Location> Locations { get; set; } = new List<Location>();
        public ICollection<TransitHubs> TransitHubs { get; set; } = new List<TransitHubs>();
    }
}
