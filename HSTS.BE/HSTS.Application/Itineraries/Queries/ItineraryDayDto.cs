using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record ItineraryDayDto(
         int DayNumber,
         string DayTitle,
         DateOnly Date,
         int ProvinceId,
         string? WeatherSummary,
         MoneyDto EstimatedCost,
         IList<ItineraryTimelineItemDto> Timeline);
}
