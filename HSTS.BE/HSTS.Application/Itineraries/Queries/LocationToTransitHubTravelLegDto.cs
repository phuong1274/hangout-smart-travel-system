using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record LocationToTransitHubTravelLegDto(
        int FromLocationId,
        int ToTransitHubId,
        TimeOnly DepartureTime,
        TimeOnly ArrivalTime,
        double DistanceKm,
        string? SelectedMethod,
        int SelectedTravelTimeMinutes,
        MoneyDto SelectedTotalCost,
        IList<TransportOptionDto> TransportOptions);
}
