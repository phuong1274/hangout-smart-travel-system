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
        string? PriceRange = null,
        decimal? PriceMinUsd = null,
        decimal? PriceMaxUsd = null,
        int? RecommendedDurationMinutes = null,
        List<int>? AmenityIds = null);

    public record LocationSocialLinkDto(
        int Id,
        string Platform,
        string Url);
}
