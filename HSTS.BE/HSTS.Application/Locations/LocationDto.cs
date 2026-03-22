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
        int DestinationId,
        string? LocationTypeName = null,
        string? DestinationName = null,
        List<int>? TagIds = null,
        List<string>? MediaLinks = null,
        List<LocationSocialLinkDto>? SocialLinks = null,
        string? Telephone = null,
        string? Email = null,
        decimal? PriceMinUsd = null,
        decimal? PriceMaxUsd = null,
        int? RecommendedDurationMinutes = null,
        decimal? Score = null,
        List<int>? AmenityIds = null,
        List<LocationOpeningHourDto>? OpeningHours = null,
        List<LocationSeasonDto>? Seasons = null,
        DateTime CreatedAt = default,
        DateTime? UpdatedAt = null
    );

    public record LocationSocialLinkDto(
        int Id,
        string Platform,
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
