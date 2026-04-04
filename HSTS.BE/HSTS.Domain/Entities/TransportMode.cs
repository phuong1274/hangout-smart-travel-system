using HSTS.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class TransportMode : BaseEntity
    {
        public int Id { get; set; }
        public CategoryTransport Category { get; set; }
        public string Name { get; set; } = null!;
        public int Capacity { get; set; }

        // Navigation properties
        public LocalTransportMetrics? LocalTransportMetrics { get; set; }
        public ICollection<TransitHubs> TransitHubs { get; set; } = new List<TransitHubs>();
    }
}
