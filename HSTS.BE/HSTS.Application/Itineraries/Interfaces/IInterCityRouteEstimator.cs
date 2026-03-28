namespace HSTS.Application.Itineraries.Interfaces
{
    // Keep this interface as the integration seam for future external map/transport APIs.
    public interface IInterCityRouteEstimator
    {
        Task<RouteEstimate> EstimateAsync(
            Province fromProvince,
            Province toProvince,
            int groupSize,
            CancellationToken cancellationToken = default);
    }

    public record RouteEstimate(
        string Method,
        string Description,
        string? DepartureHub,
        string? ArrivalHub,
        decimal TotalCost,
        int TravelTimeMinutes,
        string Pros,
        string Cons,
        double DistanceKm);
}