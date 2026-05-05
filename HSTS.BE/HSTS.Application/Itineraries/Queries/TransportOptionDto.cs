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
        int? FromTransitHubId,
        string? FromTransitHubName,
        int? ToTransitHubId,
        string? ToTransitHubName,
        int VehiclesNeeded,
        MoneyDto CostForGroup,
        bool IsEstimate = false,
        string? Warning = null,
        LocalTravelEstimateDto? FirstMileEstimate = null,
        LocalTravelEstimateDto? LastMileEstimate = null);
}
