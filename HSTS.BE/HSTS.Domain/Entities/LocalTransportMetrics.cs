namespace HSTS.Domain.Entities
{
    public class LocalTransportMetrics : BaseEntity
    {
        public int TransportationId { get; set; }
        public decimal CostPerKm { get; set; }
        public decimal SpeedKmh { get; set; }
        public decimal MaxRecommendedDistance { get; set; }

        // Navigation properties
        public TransportMode TransportMode { get; set; } = null!;
    }
}
