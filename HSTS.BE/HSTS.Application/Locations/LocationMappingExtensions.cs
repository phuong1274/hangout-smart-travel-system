using HSTS.Domain.Entities;

namespace HSTS.Application.Locations
{
    public static class LocationMappingExtensions
    {
        public static LocationDto ToDto(this Location location)
        {
            return new LocationDto(
                location.Id,
                location.Name,
                location.Description,
                location.Latitude,
                location.Longitude,
                location.TicketPrice,
                location.MinimumAge,
                location.Address,
                location.SocialLink,
                location.LocationTypeId);
        }
    }
}
