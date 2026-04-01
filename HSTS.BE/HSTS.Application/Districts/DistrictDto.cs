namespace HSTS.Application.Districts
{
    public record DistrictDto(
        int Id,
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? ProvinceId,
        string? ProvinceName,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}
