using HSTS.Application.Locations.Commands;
using static HSTS.Application.Locations.Commands.SocialLinkDto;

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
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        int? RecommendedDurationMinutes,
        List<int>? TagIds,
        List<string>? MediaLinks,
        List<Application.Locations.Commands.SocialLinkDto>? SocialLinks,
        List<int>? AmenityIds);
}
