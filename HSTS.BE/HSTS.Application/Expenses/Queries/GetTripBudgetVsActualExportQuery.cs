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

            // Get all budgets with activity info
            var budgets = await _budgetRepository.Query()
                .Include(b => b.TripActivity)
                    .ThenInclude(a => a.TripDay)
                .Where(b => b.TripActivity.TripDay.TripId == request.TripId)
                .ToListAsync(cancellationToken);

            // Get all expenses with activity info
            var expenses = await _expenseRepository.Query()
                .Include(e => e.TripActivity)
                    .ThenInclude(a => a.TripDay)
                .Where(e => e.TripActivity.TripDay.TripId == request.TripId && !e.IsDeleted)
                .OrderBy(e => e.CreatedAt)
                .ToListAsync(cancellationToken);

            // Collect user IDs for name resolution
            var userIds = expenses
                .Where(e => !string.IsNullOrEmpty(e.CreatedBy))
                .Select(e => e.CreatedBy!)
                .Where(id => int.TryParse(id, out _))
                .Select(int.Parse)
                .Distinct()
                .ToList();

            var userNames = new Dictionary<string, string>();
            if (userIds.Count > 0)
            {
                var users = await _userRepository.Query()
                    .Where(u => userIds.Contains(u.Id))
                    .Select(u => new { u.Id, u.FullName })
                    .ToListAsync(cancellationToken);

                foreach (var u in users)
                    userNames[u.Id.ToString()] = u.FullName;
            }

            // Build activity-level export data
            var activities = budgets
                .OrderBy(b => b.TripActivity.TripDay.DayNumber)
                .ThenBy(b => b.TripActivity.StartTime)
                .Select(b =>
                {
                    var activityExpenses = expenses
                        .Where(e => e.TripActivityId == b.TripActivityId)
                        .Select(e => new ActivityExpenseLogDto(
                            e.Title,
                            e.Description,
                            e.TotalAmount,
                            e.CreatedBy != null && userNames.TryGetValue(e.CreatedBy, out var name) ? name : e.CreatedBy ?? "Unknown",
                            e.CreatedAt
                        ))
                        .ToList();

                    return new ActivityBudgetExportDto(
                        b.TripActivity.TripDay.DayNumber,
                        b.TripActivity.Title,
                        b.EstimateCost,
                        activityExpenses.Sum(x => x.Amount),
                        activityExpenses
                    );
                })
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
