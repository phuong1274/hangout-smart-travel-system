using ErrorOr;
using HSTS.Application.Expenses;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Expenses.Queries
{
    public record GetTripBudgetVsActualQuery(int TripId) : IRequest<ErrorOr<TripBudgetVsActualDto>>;

    public class GetTripBudgetVsActualQueryHandler : IRequestHandler<GetTripBudgetVsActualQuery, ErrorOr<TripBudgetVsActualDto>>
    {
        private readonly IRepository<Trip> _tripRepository;
        private readonly IRepository<TripActivityBudget> _budgetRepository;
        private readonly IRepository<Expense> _expenseRepository;

        public GetTripBudgetVsActualQueryHandler(
            IRepository<Trip> tripRepository,
            IRepository<TripActivityBudget> budgetRepository,
            IRepository<Expense> expenseRepository)
        {
            _tripRepository = tripRepository;
            _budgetRepository = budgetRepository;
            _expenseRepository = expenseRepository;
        }

        public async Task<ErrorOr<TripBudgetVsActualDto>> Handle(GetTripBudgetVsActualQuery request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.Query()
                .Include(t => t.TripSummary)
                .FirstOrDefaultAsync(t => t.Id == request.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            var currency = trip.Currency;

            // Get all activity budgets for this trip
            var budgets = await _budgetRepository.Query()
                .Include(b => b.TripActivity)
                    .ThenInclude(a => a.TripDay)
                .Where(b => b.TripActivity.TripDay.TripId == request.TripId)
                .ToListAsync(cancellationToken);

            // Get all expenses for this trip
            var expenses = await _expenseRepository.Query()
                .Include(e => e.TripActivity)
                    .ThenInclude(a => a.TripDay)
                .Where(e => e.TripActivity.TripDay.TripId == request.TripId && !e.IsDeleted)
                .ToListAsync(cancellationToken);

            // Group expenses by activity
            var expensesByActivity = expenses
                .GroupBy(e => e.TripActivityId)
                .ToDictionary(g => g.Key, g => g.Sum(e => e.TotalAmount));

            // Build activity-level comparison
            var activities = budgets
                .OrderBy(b => b.TripActivity.TripDay.DayNumber)
                .ThenBy(b => b.TripActivity.StartTime)
                .Select(b =>
                {
                    var actualCost = expensesByActivity.GetValueOrDefault(b.TripActivityId, 0m);
                    var variance = actualCost - b.EstimateCost;
                    var status = variance > 0 ? BudgetStatus.OverBudget :
                                 variance < 0 ? BudgetStatus.UnderBudget :
                                 BudgetStatus.OnBudget;

                    return new ActivityBudgetVsActualDto(
                        b.TripActivityId,
                        b.TripActivity.Title,
                        b.TripActivity.TripDay.DayNumber,
                        b.EstimateCost,
                        actualCost,
                        variance,
                        currency,
                        status
                    );
                })
                .ToList();

            // Find activities with expenses but no budget
            var budgetedActivityIds = budgets.Select(b => b.TripActivityId).ToHashSet();
            var unbudgetedActivities = expenses
                .Where(e => !budgetedActivityIds.Contains(e.TripActivityId))
                .GroupBy(e => new { e.TripActivityId, e.TripActivity.Title, e.TripActivity.TripDay.DayNumber })
                .Select(g => new ActivityBudgetVsActualDto(
                    g.Key.TripActivityId,
                    g.Key.Title,
                    g.Key.DayNumber,
                    0m,
                    g.Sum(e => e.TotalAmount),
                    g.Sum(e => e.TotalAmount),
                    currency,
                    BudgetStatus.NoBudget
                ))
                .ToList();

            activities.AddRange(unbudgetedActivities.OrderBy(a => a.DayNumber));

            // Build category-level comparison based on TripSummary
            var categories = new List<CategoryBudgetVsActualDto>();

            if (trip.TripSummary != null)
            {
                var accommodationActual = expenses
                    .Where(e => e.TripActivity.Type == Domain.Enums.ActivityType.CheckIn || 
                                e.TripActivity.Type == Domain.Enums.ActivityType.CheckOut)
                    .Sum(e => e.TotalAmount);

                var transportActual = expenses
                    .Where(e => e.TripActivity.Type == Domain.Enums.ActivityType.Travel)
                    .Sum(e => e.TotalAmount);

                var activityActual = expenses
                    .Where(e => e.TripActivity.Type == Domain.Enums.ActivityType.Visit ||
                                e.TripActivity.Type == Domain.Enums.ActivityType.Shopping ||
                                e.TripActivity.Type == Domain.Enums.ActivityType.Meal)
                    .Sum(e => e.TotalAmount);

                categories.Add(new CategoryBudgetVsActualDto(
                    "Accommodation",
                    trip.TripSummary.EstimatedAccommodationCost,
                    accommodationActual,
                    accommodationActual - trip.TripSummary.EstimatedAccommodationCost,
                    currency,
                    accommodationActual > trip.TripSummary.EstimatedAccommodationCost ? BudgetStatus.OverBudget :
                    accommodationActual < trip.TripSummary.EstimatedAccommodationCost ? BudgetStatus.UnderBudget :
                    BudgetStatus.OnBudget
                ));

                categories.Add(new CategoryBudgetVsActualDto(
                    "Transport",
                    trip.TripSummary.EstimatedTransportCost,
                    transportActual,
                    transportActual - trip.TripSummary.EstimatedTransportCost,
                    currency,
                    transportActual > trip.TripSummary.EstimatedTransportCost ? BudgetStatus.OverBudget :
                    transportActual < trip.TripSummary.EstimatedTransportCost ? BudgetStatus.UnderBudget :
                    BudgetStatus.OnBudget
                ));

                categories.Add(new CategoryBudgetVsActualDto(
                    "Activities",
                    trip.TripSummary.EstimatedActivityCost,
                    activityActual,
                    activityActual - trip.TripSummary.EstimatedActivityCost,
                    currency,
                    activityActual > trip.TripSummary.EstimatedActivityCost ? BudgetStatus.OverBudget :
                    activityActual < trip.TripSummary.EstimatedActivityCost ? BudgetStatus.UnderBudget :
                    BudgetStatus.OnBudget
                ));
            }

            // Calculate totals
            var totalEstimated = budgets.Sum(b => b.EstimateCost);
            var totalActual = expenses.Sum(e => e.TotalAmount);
            var totalVariance = totalActual - totalEstimated;
            var overallStatus = totalVariance > 0 ? BudgetStatus.OverBudget :
                                totalVariance < 0 ? BudgetStatus.UnderBudget :
                                BudgetStatus.OnBudget;

            return new TripBudgetVsActualDto(
                trip.Id,
                trip.TripName,
                totalEstimated,
                totalActual,
                totalVariance,
                currency,
                overallStatus,
                categories,
                activities
            );
        }
    }
}
