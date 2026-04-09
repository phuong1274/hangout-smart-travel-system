namespace HSTS.Application.TransitHubQueries.Queries
{
    public record TransitHubItemDto(
        int Id,
        string Code,
        string Name,
        double Latitude,
        double Longitude,
        int TransportationId,
        string? TransportModeName,
        int TransitHubTypeId,
        string? TransitHubTypeName,
        int DistrictId,
        string? DistrictName,
        string? ProvinceName);
}
