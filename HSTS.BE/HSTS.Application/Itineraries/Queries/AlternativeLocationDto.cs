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
        IList<string> TagNames,
        MoneyDto TicketCost,
        MoneyDto ExtraCostPerPerson,
        double Score,
        double DistanceFromPrevKm,
        int EstimatedTravelMinutes,
        string? Address,
        string? Telephone,
        IList<string> MediaUrls);
}
