using HSTS.Domain.Entities;

namespace HSTS.Application.LocalTransportMetricsFeature
{
    public static class LocalTransportMetricsMappingExtensions
    {
        public static LocalTransportMetricsDto ToDto(this LocalTransportMetrics entity)
        {
            return new LocalTransportMetricsDto(
                entity.TransportationId,
                entity.TransportMode?.Name,
                entity.BaseFare,
                entity.BaseDistance,
                entity.PricePerKm,
                entity.LongDistanceThreshold,
                entity.LongDistancePricePerKm,
                entity.CongestionFeePerMinute,
                entity.SpeedKmh,
                entity.MaxRecommendedDistance,
                entity.CreatedAt,
                entity.UpdatedAt);
        }
    }
}
