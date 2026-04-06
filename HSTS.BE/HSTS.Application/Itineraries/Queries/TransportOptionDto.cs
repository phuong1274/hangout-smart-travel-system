using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record TransportOptionDto(
        int TransportModeId,
        string Method,
        int EstimatedTravelMinutes,
        MoneyDto EstimatedTotalCost,
        bool Recommended,
        string Note,
        int FromTransitHubId,
        int ToTransitHubId,
        int VehiclesNeeded,
        MoneyDto CostForGroup);
}
