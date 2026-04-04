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
       int LocationTypeId,
       IList<int> TagIds,
       MoneyDto? TicketCost,
       MoneyDto? ExtraCostPerPerson,
       MoneyDto? CostForGroup,
       string Note,
       LocationToLocationTravelLegDto? LocationToLocationTravel = null,
       TransitHubToLocationTravelLegDto? TransitHubToLocationTravel = null,
       LocationToTransitHubTravelLegDto? LocationToTransitHubTravel = null,
       IList<AlternativeLocationDto>? Alternatives = null);

}
