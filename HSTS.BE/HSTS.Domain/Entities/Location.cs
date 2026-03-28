namespace HSTS.Domain.Entities
{
    public class Location : BaseEntity
    {
        public int Id { get; set; }
        public int ProvinceId { get; set; }
        public int? DistrictId { get; set; }
        public string? Code { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public decimal Longitude { get; set; }
        public decimal Latitude { get; set; }
        public decimal AverageBudget { get; set; }
        public int AverageStayDurationMinutes { get; set; }
        public bool IsOpen24Hours { get; set; }
        public TimeOnly? OpenTime { get; set; }
        public TimeOnly? CloseTime { get; set; }

        public Province Province { get; set; } = null!;
        public District? District { get; set; }
        public ICollection<LocationTag> LocationTags { get; set; } = new List<LocationTag>();
        public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();
    }
}