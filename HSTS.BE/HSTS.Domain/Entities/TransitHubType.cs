using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class TransitHubType : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;

        // Navigation properties
        public ICollection<TransitHubs> TransitHubs { get; set; } = new List<TransitHubs>();
    }
}
