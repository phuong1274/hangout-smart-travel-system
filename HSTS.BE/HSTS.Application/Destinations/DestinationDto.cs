namespace HSTS.Application.Destinations
{
    public record DestinationDto(
        int Id,
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? Type,
        int? StateId,
        string? StateName,
        string? CountryId,
        string? CountryName,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}
