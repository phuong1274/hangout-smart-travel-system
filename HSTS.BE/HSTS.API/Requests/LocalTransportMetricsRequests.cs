namespace HSTS.API.Requests
{
    public record CreateLocalTransportMetricsRequest(
        int TransportationId,
        decimal CostPerKm,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance);

    public record UpdateLocalTransportMetricsRequest(
        decimal CostPerKm,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance);
}
