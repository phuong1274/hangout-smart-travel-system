using System.ComponentModel.DataAnnotations;

namespace HSTS.Domain.Entities
{
    public class LocationSocialLink : BaseEntity
    {
        [Required]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Platform { get; set; } = null!;  // e.g., "Facebook", "Instagram", "Website", "TikTok"

        [Required]
        [MaxLength(500)]
        [Url]
        public string Url { get; set; } = null!;

        [Required]
        public int LocationId { get; set; }
        public Location? Location { get; set; }
    }
}
