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
                location.LocationTypeId,
                location.DestinationId,
                location.LocationType?.Name ?? string.Empty,
                location.Destination?.Name ?? string.Empty,
                location.LocationTags.Select(lt => lt.Tag.Id).ToList(),
                location.LocationMedias.Select(lm => lm.Link).ToList(),
                location.Telephone,
                location.Email,
                location.Rating,
                location.ReviewCount,
                location.PriceRange,
                location.PriceMinUsd,
                location.PriceMaxUsd,
                location.Source,
                location.SourceUrl,
                location.RecommendedDurationMinutes,
                location.LocationAmenities.Select(la => la.Amenity.Id).ToList());
        }
    }
}
