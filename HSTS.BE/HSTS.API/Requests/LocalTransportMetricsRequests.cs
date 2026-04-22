namespace HSTS.API.Requests
{
    public record CreateLocalTransportMetricsRequest(
        int TransportationId,
        decimal BaseFare,
        decimal BaseDistance,
        decimal PricePerKm,
        decimal? LongDistanceThreshold,
        decimal? LongDistancePricePerKm,
        decimal CongestionFeePerMinute,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance);

    public record UpdateLocalTransportMetricsRequest(
        decimal BaseFare,
        decimal BaseDistance,
        decimal PricePerKm,
        decimal? LongDistanceThreshold,
        decimal? LongDistancePricePerKm,
        decimal CongestionFeePerMinute,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance);
}
