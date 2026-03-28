namespace HSTS.Domain.Entities
{
    public class TransitHub : BaseEntity
    {
        public int Id { get; set; }
        public int ProvinceId { get; set; }
        public int? DistrictId { get; set; }
        public int TransportModeId { get; set; }
        public int TransitHubTypeId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public decimal Longitude { get; set; }
        public decimal Latitude { get; set; }

        public Province Province { get; set; } = null!;
        public District? District { get; set; }
        public TransportMode TransportMode { get; set; } = null!;
        public TransitHubType TransitHubType { get; set; } = null!;
    }
}