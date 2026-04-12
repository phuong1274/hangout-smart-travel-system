namespace HSTS.Application.LocalTransportMetricsFeature
{
    public record LocalTransportMetricsDto(
        int TransportationId,
        string? TransportModeName,
        decimal CostPerKm,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance,
        DateTime CreatedAt,
        DateTime? UpdatedAt);
}
