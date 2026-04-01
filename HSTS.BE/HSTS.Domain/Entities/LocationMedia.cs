using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class LocationMedia : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public string Link { get; set; } = null!;

        public Location Location { get; set; } = null!;
    }
}
