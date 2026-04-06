using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record AlternativeLocationDto(
        int LocationId,
        string LocationName,
        int LocationTypeId,
        IList<int> TagIds,
        MoneyDto TicketCost,
        MoneyDto ExtraCostPerPerson,
        double Score,
        double DistanceFromPrevKm,
        int EstimatedTravelMinutes,
        int RecommendedStayMinutes);
}
