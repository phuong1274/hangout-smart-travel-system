using System;
using System.Collections.Generic;

namespace HSTS.Application.Itineraries.Queries
{
    public record ProvinceToProvinceTravelLegDto(
         int FromProvinceId,
         string FromProvinceName,
         int ToProvinceId,
         string ToProvinceName,
         TimeOnly DepartureTime,
         TimeOnly ArrivalTime,
         double DistanceKm,
         string? SelectedMethod,
         int SelectedTravelTimeMinutes,
         MoneyDto SelectedTotalCost,
         IList<TransportOptionDto> TransportOptions);
}
