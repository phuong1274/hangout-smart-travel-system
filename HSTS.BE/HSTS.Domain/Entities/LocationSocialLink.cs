using System.ComponentModel.DataAnnotations;
using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class LocationSocialLink : BaseEntity
    {
        [Required]
        public int Id { get; set; }

        [Required]
        public SocialPlatform Platform { get; set; }

        [Required]
        [MaxLength(500)]
        [Url]
        public string Url { get; set; } = null!;

        [Required]
        public int LocationId { get; set; }
        public Location? Location { get; set; }
    }
}
