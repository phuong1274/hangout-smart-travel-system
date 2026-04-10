using System;
using System.Collections.Generic;

namespace HSTS.Application.Itineraries.Queries
{
    public record LocalTravelEstimateDto(
        // From info
        int FromId,
        string FromName,

        // To info
        int ToId,
        string ToName,

        // Results
        TimeOnly? DepartureTime,
        TimeOnly? ArrivalTime,
        double DistanceKm,
        string? SelectedMethod,
        int? SelectedTravelTimeMinutes,
        MoneyDto SelectedTotalCost,
        IList<TransportOptionDto> TransportOptions);
}
