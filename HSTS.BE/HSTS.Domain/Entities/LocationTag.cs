using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class LocationTag : BaseEntity
    {
        public int LocationId { get; set; }
        public int TagId { get; set; }
        public double Score { get; set; }
        public Location Location { get; set; }
        public Tag Tag { get; set; }

    }
}
