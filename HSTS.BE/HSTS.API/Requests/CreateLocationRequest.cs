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
        string? SocialLink,
        int LocationTypeId,
        int DestinationId,
        List<int>? TagIds,
        List<string>? MediaLinks);
}
