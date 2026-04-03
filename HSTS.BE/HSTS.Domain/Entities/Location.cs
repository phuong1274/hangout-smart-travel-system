using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class Location : BaseEntity
    {
        public int Id { get; set; }
        public int ProvinceId { get; set; }
        public int DistrictId { get; set; }
        public int LocationTypeId { get; set; }
        public LocationStatus Status { get; set; } = LocationStatus.Active;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public double? TicketPrice { get; set; }
        public int? MinimumAge { get; set; }
        public int? PriceMin { get; set; }
        public int? PriceMax { get; set; }
        public decimal Score { get; set; }
        public string Address { get; set; } = null!;
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public int? RecommentDurationsMinutes { get; set; }
        public double? Longitude { get; set; }
        public double? Latitude { get; set; }
        public string? Source { get; set; }
        public string? SourceUrl { get; set; }

        // Navigation properties
        public Province Province { get; set; } = null!;
        public District District { get; set; } = null!;
        public LocationType LocationType { get; set; } = null!;
        public ICollection<Amenities> Amenities { get; set; } = new List<Amenities>();
        public ICollection<Tag> Tags { get; set; } = new List<Tag>();
        public ICollection<OpeningHours> OpeningHours { get; set; } = new List<OpeningHours>();
        public ICollection<SocialLinks> SocialLinks { get; set; } = new List<SocialLinks>();
        public ICollection<LocationMedia> LocationMedias { get; set; } = new List<LocationMedia>();
        public ICollection<LocationClosure> LocationClosures { get; set; } = new List<LocationClosure>();
    }
}
