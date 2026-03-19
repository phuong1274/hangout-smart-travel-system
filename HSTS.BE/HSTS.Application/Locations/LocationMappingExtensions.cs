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
                location.LocationTypeId,
                location.DestinationId,
                location.LocationType?.Name,
                location.Destination?.Name,
                location.LocationTags.Select(lt => lt.TagId).ToList(),
                location.LocationMedias.Select(lm => lm.Link).ToList(),
                location.SocialLinks.Select(sl => new LocationSocialLinkDto(sl.Id, sl.Platform, sl.Url)).ToList(),
                location.Telephone,
                location.Email,
                location.PriceMinUsd,
                location.PriceMaxUsd,
                location.RecommendedDurationMinutes,
                location.Score,
                location.LocationAmenities.Select(la => la.AmenityId).ToList(),
                location.OpeningHours.Select(oh => new LocationOpeningHourDto(
                    oh.Id,
                    (int)oh.DayOfWeek,
                    oh.DayOfWeek.ToString(),
                    oh.OpenTime,
                    oh.CloseTime,
                    oh.IsClosed,
                    oh.Note
                )).ToList(),
                location.Seasons.Select(s => new LocationSeasonDto(
                    s.Id,
                    s.Description,
                    s.Months
                )).ToList(),
                location.CreatedAt,
                location.UpdatedAt
            );
        }
    }
}
