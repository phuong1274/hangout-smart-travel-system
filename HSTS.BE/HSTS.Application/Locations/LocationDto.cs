namespace HSTS.Application.Locations
{
    public record LocationDto(
        int Id,
        string Name,
        string? Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        int? LocationTypeId,
        int DistrictId,
        string? LocationTypeName,
        string? DistrictName = null,
        // New structured format
        List<LocationTagDto>? Tags = null,
        // Backward compatibility
        List<int>? TagIds = null,
        List<string>? TagNames = null,
        List<string>? MediaLinks = null,
        List<LocationSocialLinkDto>? SocialLinks = null,
        string? Telephone = null,
        string? Email = null,
        decimal? PriceMinUsd = null,
        decimal? PriceMaxUsd = null,
        int? RecommendedDurationMinutes = null,
        decimal? Score = null,
        // New structured format
        List<LocationAmenityDto>? Amenities = null,
        // Backward compatibility
        List<int>? AmenityIds = null,
        List<string>? AmenityNames = null,
        List<LocationOpeningHourDto>? OpeningHours = null,
        List<LocationSeasonDto>? Seasons = null,
        Domain.Enums.LocationStatus Status = default,
        Domain.Enums.LocationStatus EffectiveStatus = default,
        DateTime CreatedAt = default,
        DateTime? UpdatedAt = null
    );

    public record LocationTagDto(int Id, string Name);

    public record LocationAmenityDto(int Id, string Name);

    public record LocationSocialLinkDto(
        int Id,
        Domain.Enums.SocialPlatform Platform,
        string Url);

    public record LocationOpeningHourDto(
        int Id,
        int DayOfWeek,
        string DayName,
        TimeSpan? OpenTime,
        TimeSpan? CloseTime,
        string? Note);

    public record LocationSeasonDto(
        int Id,
        string Description,
        string Months);
}
