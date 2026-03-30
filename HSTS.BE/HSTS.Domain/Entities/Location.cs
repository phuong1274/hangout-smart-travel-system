using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Domain.Entities
{
    public class Location : BaseEntity
    {
        public int Id { get; set; }
        public int DistrictId { get; set; }
        public int LocationTypeId { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public double? TicketPrice { get; set; }
        public int MinimumAge { get; set; }
        public int PriceMin { get; set; }
        public int PriceMax { get; set; }
        public decimal Score { get; set; }
        public string Address { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public string Email { get; set; } = null!;
        public int? RecommentDurationsMinutes { get; set; }
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public string Source { get; set; } = null!;
        public string SourceUrl { get; set; } = null!;

        // Navigation properties
        public District District { get; set; } = null!;
        public LocationType LocationType { get; set; } = null!;
    }
}
