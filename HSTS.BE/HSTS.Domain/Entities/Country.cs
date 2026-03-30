using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class Country : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;

        // Navigation properties
        public ICollection<Province> Provinces { get; set; } = new List<Province>();
    }
}
