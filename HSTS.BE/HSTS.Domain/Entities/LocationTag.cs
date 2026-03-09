using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class LocationTag : BaseEntity
    {
        [Required]
        public int LocationId { get; set; }
        public Location? Location { get; set; }

        [Required]
        public int TagId { get; set; }
        public Tag? Tag { get; set; }

        [Range(0, 1)]
        public double Score { get; set; }
    }
}
