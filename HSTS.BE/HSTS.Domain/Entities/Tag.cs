using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class Tag : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public ICollection<LocationTag> LocationTags { get; set; }
    }
}
