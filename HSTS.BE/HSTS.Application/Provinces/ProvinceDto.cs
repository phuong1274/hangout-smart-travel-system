namespace HSTS.Application.Provinces
{
    public record ProvinceDto(
        int Id,
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        string CountryId,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}
