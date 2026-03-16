namespace HSTS.API.Requests
{
    public record CreateDestinationRequest(
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? Type,
        int? StateId,
        string? CountryId
    );
}
