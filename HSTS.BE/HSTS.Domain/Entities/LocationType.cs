using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class LocationType : BaseEntity
    {
        public int Id { get; set; }

        public string Name { get; set; }
        public ICollection<Location> Locations { get; set; }
    }
}
