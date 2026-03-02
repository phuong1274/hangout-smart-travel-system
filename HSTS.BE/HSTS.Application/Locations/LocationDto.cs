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
        int LocationTypeId);
}
