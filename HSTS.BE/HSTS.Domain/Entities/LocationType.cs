using System.ComponentModel.DataAnnotations;
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

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = null!;

        [MaxLength(200)]
        public string? Description { get; set; }

        // Navigation property
        public ICollection<Location> Locations { get; set; } = new List<Location>();
    }
}
