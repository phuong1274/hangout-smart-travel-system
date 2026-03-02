using HSTS.Domain.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace HSTS.Domain.Entities
{
    public class Location : BaseEntity
    {
        [Required]
        public int Id { get; set; }
        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        [MaxLength(2000)]
        public string Description { get; set; }

        [Required]
        [Range(-90, 90)]
        public double Latitude { get; set; }

        [Required]
        [Range(-180, 180)]
        public double Longitude { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        [Range(0, 100000000)]
        public decimal TicketPrice { get; set; }

        [Range(0, 120)]
        public int MinimumAge { get; set; }

        [Required]
        [MaxLength(300)]
        public string Address { get; set; }

        [Url]
        [MaxLength(500)]
        public string? SocialLink { get; set; }

        [Required]
        public int LocationTypeId { get; set; }

        public LocationType LocationType { get; set; }

        public int DestinationId { get; set; }

        public Destination Destination { get; set; }

        public ICollection<LocationTag> LocationTags { get; set; }

        public ICollection<LocationMedia> LocationMedias { get; set; }

    }
}