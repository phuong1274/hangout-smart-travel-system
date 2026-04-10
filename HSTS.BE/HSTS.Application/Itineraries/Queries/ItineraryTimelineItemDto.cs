using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record ItineraryTimelineItemDto(
       string EventType,
       string Title,
       TimeOnly StartTime,
       TimeOnly EndTime,
       int LocationId,
       IList<string> TagNames,
       MoneyDto? TicketCost,
       MoneyDto? ExtraCostPerPerson,
       MoneyDto? CostForGroup,
       string Note,
       double Score,
       string? Address = null,
       string? Telephone = null,
       IList<string>? MediaUrls = null,
       LocationToLocationTravelLegDto? LocationToLocationTravel = null,
       TransitHubToLocationTravelLegDto? TransitHubToLocationTravel = null,
       LocationToTransitHubTravelLegDto? LocationToTransitHubTravel = null,
       ProvinceToProvinceTravelLegDto? ProvinceToProvinceTravel = null,
       IList<AlternativeLocationDto>? Alternatives = null,
       IList<AccommodationRecommendationDto>? AccommodationRecommendations = null);

}
