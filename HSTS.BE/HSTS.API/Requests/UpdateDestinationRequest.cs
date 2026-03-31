namespace HSTS.API.Requests
{
    public record UpdateDestinationRequest(
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? StateId,
        string? CountryId
    );
}
