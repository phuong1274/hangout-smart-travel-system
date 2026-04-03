namespace HSTS.API.Requests
{
    public record UpdateDistrictRequest(
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? ProvinceId
    );
}
