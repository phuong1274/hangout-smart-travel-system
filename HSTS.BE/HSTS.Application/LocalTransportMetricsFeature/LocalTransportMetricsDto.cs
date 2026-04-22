namespace HSTS.Application.LocalTransportMetricsFeature
{
    public record LocalTransportMetricsDto(
        int TransportationId,
        string? TransportModeName,
        decimal BaseFare,
        decimal BaseDistance,
        decimal PricePerKm,
        decimal? LongDistanceThreshold,
        decimal? LongDistancePricePerKm,
        decimal CongestionFeePerMinute,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance,
        DateTime CreatedAt,
        DateTime? UpdatedAt);
}
