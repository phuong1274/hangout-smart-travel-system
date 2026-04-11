using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record BudgetSummaryDto(
         MoneyDto TotalBudget,
         MoneyDto ContingencyFund,
         MoneyDto UsableBudget,
         MoneyDto EstimatedTransportCost,
         MoneyDto EstimatedAccommodationCost,
         MoneyDto EstimatedMealCost,
         MoneyDto EstimatedActivityCost,
         MoneyDto EstimatedTotalCost,
         MoneyDto RemainingBudget);
}
