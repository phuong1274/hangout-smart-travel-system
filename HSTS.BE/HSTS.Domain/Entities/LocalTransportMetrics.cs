namespace HSTS.Domain.Entities
{
    public class LocalTransportMetrics : BaseEntity
    {
        public int TransportationId { get; set; }
        public decimal BaseFare { get; set; }
        public decimal BaseDistance { get; set; }
        public decimal PricePerKm { get; set; }
        public decimal? LongDistanceThreshold { get; set; }
        public decimal? LongDistancePricePerKm { get; set; }
        public decimal CongestionFeePerMinute { get; set; }
        public decimal SpeedKmh { get; set; }
        public decimal? MaxRecommendedDistance { get; set; }

        // Navigation properties
        public TransportMode TransportMode { get; set; } = null!;
    }
}
