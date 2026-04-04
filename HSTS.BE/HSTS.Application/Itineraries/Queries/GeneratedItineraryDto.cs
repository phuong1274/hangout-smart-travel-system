using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record GeneratedItineraryDto(
        UserLocation UserLocation,
        List<DestinationRequest> Destinations,
        DateOnly StartDate,
        DateOnly EndDate,
        int GroupSize,
        string CurrencyCode,
        string BudgetLevel,
        BudgetSummaryDto BudgetSummary,
        IList<ItineraryDayDto> Days,
        IList<string> Notes);
}
