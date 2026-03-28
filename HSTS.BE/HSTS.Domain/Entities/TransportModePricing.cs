namespace HSTS.Domain.Entities
{
    public class TransportModePricing : BaseEntity
    {
        public int TransportModeId { get; set; }
        public decimal CostPerKm { get; set; }
        public double SpeedKmh { get; set; }
        public double MaxRecommendedDistance { get; set; }

        public TransportMode TransportMode { get; set; } = null!;
    }
}