using HSTS.Domain.Entities;

namespace HSTS.Application.TransportModes
{
    public static class TransportModeMappingExtensions
    {
        public static TransportModeDto ToDto(this TransportMode entity)
        {
            return new TransportModeDto(
                entity.Id,
                entity.Name,
                entity.Category,
                entity.Capacity,
                entity.CreatedAt,
                entity.UpdatedAt,
                entity.LocalTransportMetrics is not null
                    ? new LocalTransportMetricsSummaryDto(
                        entity.LocalTransportMetrics.TransportationId,
                        entity.LocalTransportMetrics.CostPerKm,
                        entity.LocalTransportMetrics.SpeedKmh,
                        entity.LocalTransportMetrics.MaxRecommendedDistance)
                    : null);
        }
    }
}
