namespace HSTS.Application.TransitHubManagement
{
    public record TransitHubDto(
        int Id,
        string Code,
        string Name,
        double Latitude,
        double Longitude,
        int DistrictId,
        string? DistrictName,
        int TransportationId,
        string? TransportModeName,
        int TransitHubTypeId,
        string? TransitHubTypeName,
        DateTime CreatedAt,
        DateTime? UpdatedAt);
}
