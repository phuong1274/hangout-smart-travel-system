using HSTS.Domain.Enums;

namespace HSTS.Application.TransportModes
{
    public record TransportModeDto(
        int Id,
        string Name,
        CategoryTransport Category,
        int Capacity,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        LocalTransportMetricsSummaryDto? LocalTransportMetrics = null);

    public record LocalTransportMetricsSummaryDto(
        int TransportationId,
        decimal BaseFare,
        decimal BaseDistance,
        decimal PricePerKm,
        decimal? LongDistanceThreshold,
        decimal? LongDistancePricePerKm,
        decimal CongestionFeePerMinute,
        decimal PeakHourMultiplier,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance);
}
