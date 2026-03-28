namespace HSTS.Domain.Entities
{
    public class Location : BaseEntity
    {
        public int LocationId { get; set; }
        public int ProvinceId { get; set; }
        public int? DistrictId { get; set; }
        public int LocationTypeId { get; set; }
        public string LocationName { get; set; } = null!;
        public string? Description { get; set; }
        public decimal TicketPrice { get; set; }
        public int? MinimumAge { get; set; }
        public decimal PriceMin { get; set; }
        public decimal PriceMax { get; set; }
        public decimal Score { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumer { get; set; }
        public string? Email { get; set; }
        public int? RecommentDurations { get; set; }
        public decimal Longitude { get; set; }
        public decimal Latitude { get; set; }
        public string? Source { get; set; }
        public string? SourceUrl { get; set; }

        public Province Province { get; set; } = null!;
        public District? District { get; set; }
        public LocationType LocationType { get; set; } = null!;
        public ICollection<LocationTag> LocationTags { get; set; } = new List<LocationTag>();
        public ICollection<LocationMedia> LocationMedias { get; set; } = new List<LocationMedia>();
        public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();
    }
}