using HSTS.Domain.Entities;

namespace HSTS.Application.Locations
{
    public static class LocationMappingExtensions
    {
        public static LocationDto ToDto(this Location location, DateTime? referenceDate = null)
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
                location.DistrictId,
                location.LocationType?.Name,
                location.District?.Name,
                location.LocationTags
                    ?.Where(lt => lt.Tag != null)
                    .Select(lt => new LocationTagDto(lt.Tag!.Id, lt.Tag!.Name))
                    .ToList(),
                // Backward compatibility
                location.LocationTags?.Select(lt => lt.TagId).ToList() ?? [],
                location.LocationTags?.Where(lt => lt.Tag != null).Select(lt => lt.Tag!.Name).ToList(),
                location.LocationMedias?.Select(lm => lm.Link).ToList() ?? [],
                location.SocialLinks?.Select(sl => new LocationSocialLinkDto(sl.Id, sl.Platform, sl.Url)).ToList() ?? [],
                location.Telephone,
                location.Email,
                location.PriceMinUsd,
                location.PriceMaxUsd,
                location.RecommendedDurationMinutes,
                location.Score,
                location.LocationAmenities
                    ?.Where(la => la.Amenity != null)
                    .Select(la => new LocationAmenityDto(la.Amenity!.Id, la.Amenity!.Name))
                    .ToList(),
                // Backward compatibility
                location.LocationAmenities?.Select(la => la.AmenityId).ToList() ?? [],
                location.LocationAmenities?.Where(la => la.Amenity != null).Select(la => la.Amenity!.Name).ToList(),
                location.OpeningHours?.Select(oh => {
                    // Get the raw integer value from DB (could be 0-6 or 1-7)
                    int dayValue = (int)oh.DayOfWeek;
                    
                    // Convert to display name
                    string dayName = dayValue switch
                    {
                        0 => "Sunday",    // .NET DayOfWeek.Sunday
                        1 => "Monday",
                        2 => "Tuesday",
                        3 => "Wednesday",
                        4 => "Thursday",
                        5 => "Friday",
                        6 => "Saturday",
                        7 => "Sunday",    // ISO 8601 Sunday (stored by frontend)
                        _ => "Unknown"
                    };
                    
                    // Convert to ISO 8601 for frontend (1=Monday, ..., 7=Sunday)
                    int isoDayValue = (dayValue == 0) ? 7 : dayValue;
                    
                    return new LocationOpeningHourDto(
                        oh.Id,
                        isoDayValue,
                        dayName,
                        oh.OpenTime,
                        oh.CloseTime,
                        oh.Note
                    );
                }).ToList() ?? [],
                location.Seasons?.Select(s => new LocationSeasonDto(
                    s.Id,
                    s.Description,
                    s.Months
                )).ToList() ?? [],
                location.Status,
                location.GetEffectiveStatus(referenceDate),
                location.CreatedAt,
                location.UpdatedAt
            );
        }
    }
}
