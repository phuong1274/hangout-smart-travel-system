using ErrorOr;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Expenses.Queries
{
    public record ActivityExpenseLogDto(
        string Title,
        string? Description,
        decimal Amount,
        string CreatedByName,
        DateTime CreatedAt
    );

    public record ActivityBudgetExportDto(
        int DayNumber,
        string ActivityName,
        decimal Budget,
        decimal ActualTotal,
        List<ActivityExpenseLogDto> ExpenseLogs
    );

    public record TripBudgetExportDto(
        string TripName,
        string Currency,
        DateTime StartDate,
        DateTime EndDate,
        decimal TotalBudget,
        decimal TotalEstimated,
        decimal TotalActual,
        List<ActivityBudgetExportDto> Activities
    );

    public record GetTripBudgetVsActualExportQuery(int TripId) : IRequest<ErrorOr<TripBudgetExportDto>>;

    public class GetTripBudgetVsActualExportQueryHandler : IRequestHandler<GetTripBudgetVsActualExportQuery, ErrorOr<TripBudgetExportDto>>
    {
        private readonly IRepository<Trip> _tripRepository;
        private readonly IRepository<TripActivityBudget> _budgetRepository;
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<User> _userRepository;

        public GetTripBudgetVsActualExportQueryHandler(
            IRepository<Trip> tripRepository,
            IRepository<TripActivityBudget> budgetRepository,
            IRepository<Expense> expenseRepository,
            IRepository<User> userRepository)
        {
            _tripRepository = tripRepository;
            _budgetRepository = budgetRepository;
            _expenseRepository = expenseRepository;
            _userRepository = userRepository;
        }

        public async Task<ErrorOr<TripBudgetExportDto>> Handle(GetTripBudgetVsActualExportQuery request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.Query()
                .Include(t => t.TripSummary)
                .FirstOrDefaultAsync(t => t.Id == request.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            var currency = trip.Currency;

            // Get all budgets with activity info using projection to avoid NULL casting issues
            var budgets = await _budgetRepository.Query()
                .Where(b => b.TripActivity.TripDay.TripId == request.TripId)
                .Select(b => new
                {
                    b.Id,
                    b.TripActivityId,
                    b.EstimateCost,
                    DayNumber = b.TripActivity.TripDay.DayNumber,
                    ActivityTitle = b.TripActivity.Title ?? "Unknown",
                    StartTime = b.TripActivity.StartTime
                })
                .ToListAsync(cancellationToken);

            // Get all expenses with activity info using projection
            var expensesData = await _expenseRepository.Query()
                .Where(e => e.TripActivity.TripDay.TripId == request.TripId && !e.IsDeleted)
                .OrderBy(e => e.CreatedAt)
                .Select(e => new
                {
                    e.Id,
                    e.TripActivityId,
                    e.Title,
                    e.Description,
                    e.TotalAmount,
                    e.CreatedBy,
                    e.CreatedAt,
                    DayNumber = e.TripActivity.TripDay.DayNumber,
                    ActivityTitle = e.TripActivity.Title ?? "Unknown"
                })
                .ToListAsync(cancellationToken);

            // Collect user IDs for name resolution
            var allCreatedBy = expensesData
                .Select(e => e.CreatedBy)
                .Distinct()
                .ToList();

            var userIds = new List<int>();
            foreach (var createdById in allCreatedBy)
            {
                if (!string.IsNullOrEmpty(createdById) && int.TryParse(createdById, out int userId))
                {
                    userIds.Add(userId);
                }
            }
            userIds = userIds.Distinct().ToList();

            var userNames = new Dictionary<string, string>();
            if (userIds.Count > 0)
            {
                var users = await _userRepository.Query()
                    .Where(u => userIds.Contains(u.Id))
                    .Select(u => new { u.Id, u.FullName })
                    .ToListAsync(cancellationToken);

                foreach (var u in users)
                    userNames[u.Id.ToString()] = u.FullName ?? "Unknown";
            }

            // Build activity-level export data
            // First, get all activities with budgets
            var budgetedActivities = budgets
                .OrderBy(b => b.DayNumber)
                .ThenBy(b => b.StartTime)
                .Select(b =>
                {
                    var activityExpenses = expensesData
                        .Where(e => e.TripActivityId == b.TripActivityId)
                        .Select(e => new ActivityExpenseLogDto(
                            e.Title,
                            e.Description,
                            e.TotalAmount,
                            !string.IsNullOrEmpty(e.CreatedBy) && userNames.TryGetValue(e.CreatedBy, out var name) ? name : "Unknown",
                            e.CreatedAt
                        ))
                        .ToList();

                    return new ActivityBudgetExportDto(
                        b.DayNumber,
                        b.ActivityTitle,
                        b.EstimateCost,
                        activityExpenses.Sum(x => x.Amount),
                        activityExpenses
                    );
                })
                .ToList();

            // Find activities with expenses but no budget
            var budgetedActivityIds = budgets.Select(b => b.TripActivityId).ToHashSet();
            var unbudgetedActivities = expensesData
                .Where(e => !budgetedActivityIds.Contains(e.TripActivityId))
                .GroupBy(e => new { e.TripActivityId, e.ActivityTitle, e.DayNumber })
                .Select(g => new ActivityBudgetExportDto(
                    g.Key.DayNumber,
                    g.Key.ActivityTitle,
                    0m, // Budget = 0 for unbudgeted activities
                    g.Sum(e => e.TotalAmount),
                    g.OrderBy(e => e.CreatedAt)
                        .Select(e => new ActivityExpenseLogDto(
                            e.Title,
                            e.Description,
                            e.TotalAmount,
                            !string.IsNullOrEmpty(e.CreatedBy) && userNames.TryGetValue(e.CreatedBy, out var name) ? name : "Unknown",
                            e.CreatedAt
                        ))
                        .ToList()
                ))
                .ToList();

            // Combine and sort by day number
            var activities = budgetedActivities.Concat(unbudgetedActivities)
                .OrderBy(a => a.DayNumber)
                .ToList();

            var totalBudget = trip.TripSummary?.TotalBudget ?? 0m;
            var totalEstimated = trip.TripSummary?.EstimatedTotalCost ?? 0m;
            var totalActual = activities.Sum(a => a.ActualTotal);

            return new TripBudgetExportDto(
                trip.TripName,
                currency,
                trip.StartDate,
                trip.EndDate,
                totalBudget,
                totalEstimated,
                totalActual,
                activities
            );
        }
    }
}
