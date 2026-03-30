using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class District : BaseEntity
    {
        public int Id { get; set; }
        public int? ProvinceId { get; set; }
        public string Name { get; set; } = null!;
        public double Longitude { get; set; }
        public double Latitude { get; set; }

        // Navigation properties
        public Province Province { get; set; } = null!;
        public ICollection<Location> Locations { get; set; } = new List<Location>();
        public ICollection<TransitHubs> TransitHubs { get; set; } = new List<TransitHubs>();
    }
}
