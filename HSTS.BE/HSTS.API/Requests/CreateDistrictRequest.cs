namespace HSTS.API.Requests
{
    public record CreateDistrictRequest(
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? ProvinceId
    );
}
