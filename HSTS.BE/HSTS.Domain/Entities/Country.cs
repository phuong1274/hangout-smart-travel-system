using System.ComponentModel.DataAnnotations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class Country : BaseEntity
    {
        [Key]
        [MaxLength(50)]
        public string Id { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = null!;

        [MaxLength(10)]
        public string? Code { get; set; }

        // Navigation properties
        public ICollection<Province> Provinces { get; set; } = new List<Province>();
    }
}
