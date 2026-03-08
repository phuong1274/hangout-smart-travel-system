using HSTS.Application.Locations.Commands;

namespace HSTS.API.Requests
{
    public record UpdateLocationRequest(
        string Name,
        string? Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        string? SocialLink,
        int LocationTypeId,
        int DestinationId,
        string? Telephone,
        string? Email,
        decimal? Rating,
        int? ReviewCount,
        string? PriceRange,
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        string? Source,
        string? SourceUrl,
        int? RecommendedDurationMinutes,
        List<TagScoreDto>? TagsWithScores,
        List<string>? MediaLinks,
        List<int>? AmenityIds);
}
