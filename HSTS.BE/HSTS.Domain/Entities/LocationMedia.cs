using System.ComponentModel.DataAnnotations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class LocationMedia : BaseEntity
    {
        [Required]
        public int Id { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Link { get; set; } = null!;

        [Required]
        public int LocationId { get; set; }
        public Location? Location { get; set; }
    }
}
