namespace HSTS.Domain.Entities
{
    public class TransitHubs : BaseEntity
    {
        public int Id { get; set; }
        public int DistrictId { get; set; }
        public int TransportationId { get; set; }
        public int TransitHubTypeId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public double Longitude { get; set; }
        public double Latitude { get; set; }

        // Navigation properties
        public District District { get; set; } = null!;
        public TransportMode TransportMode { get; set; } = null!;
        public TransitHubType TransitHubType { get; set; } = null!;
    }
}
