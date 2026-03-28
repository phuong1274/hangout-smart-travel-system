namespace HSTS.Domain.Entities
{
    public class RoomType : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public int MaxOccupancy { get; set; }
        public decimal PricePerNight { get; set; }
        public decimal? PricePerHour { get; set; }
        public int AvailableRooms { get; set; }
        public string? AmenitiesJson { get; set; }

        public Location Location { get; set; } = null!;
    }
}