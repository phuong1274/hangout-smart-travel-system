namespace HSTS.API.Requests
{
    public record CreateTransitHubRequest(
        string Code,
        string Name,
        double Latitude,
        double Longitude,
        int DistrictId,
        int TransportationId,
        int TransitHubTypeId);

    public record UpdateTransitHubRequest(
        string Code,
        string Name,
        double Latitude,
        double Longitude,
        int DistrictId,
        int TransportationId,
        int TransitHubTypeId);
}
