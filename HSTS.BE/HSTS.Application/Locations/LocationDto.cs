namespace HSTS.Application.Locations
{
    public record LocationDto(
        int Id,
        string Name,
        string Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        string? SocialLink,
        int LocationTypeId,
        int DestinationId,
        string? LocationTypeName = null,
        string? DestinationName = null,
        List<int>? TagIds = null,
        List<string>? MediaLinks = null);
}
