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
        public int? ParentId { get; set; }
        public string Tittle { get; set; } = null!;

        // Navigation properties
        public Tag? Parent { get; set; }
        public ICollection<Tag> Children { get; set; } = new List<Tag>();
    }
}
