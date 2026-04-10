namespace HSTS.Application.Interfaces
{
    public record RouteEstimate(
        double DistanceKm,
        int DurationMinutes,
        string Source);

    public interface IRouteMatrixService
    {
        Task<RouteEstimate?> EstimateAsync(
            string from,
            string to,
            CancellationToken cancellationToken = default);

        Task<RouteEstimate?> EstimateAsync(
            double fromLatitude,
            double fromLongitude,
            double toLatitude,
            double toLongitude,
            CancellationToken cancellationToken = default);
    }
}
