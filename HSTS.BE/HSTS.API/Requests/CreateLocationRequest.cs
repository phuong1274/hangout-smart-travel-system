using HSTS.Application.Locations.Commands;

namespace HSTS.API.Requests
{
    public record CreateLocationRequest(
        string Name,
        string? Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        int LocationTypeId,
        int DestinationId,
        string? Telephone,
        string? Email,
        string? PriceRange,
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        int? RecommendedDurationMinutes,
        List<TagScoreDto>? TagsWithScores,
        List<string>? MediaLinks,
        List<SocialLinkDto>? SocialLinks,
        List<int>? AmenityIds);
}
