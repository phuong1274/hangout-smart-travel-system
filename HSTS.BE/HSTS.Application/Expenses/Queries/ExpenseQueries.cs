using ErrorOr;
using HSTS.Application.Expenses;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Expenses.Queries
{
    public record GetExpenseByIdQuery(int ExpenseId) : IRequest<ErrorOr<ExpenseDto>>;
    public record GetExpensesByTripQuery(int TripId) : IRequest<ErrorOr<List<ExpenseDto>>>;
    public record GetTotalExpenseByTripQuery(int TripId) : IRequest<ErrorOr<ExpenseTotalDto>>;
    public record AggregateExpensesByTimelineQuery(int TripId) : IRequest<ErrorOr<List<ExpenseByTimelineDto>>>;
    public record GetExpensesGroupedByActivityQuery(int TripId) : IRequest<ErrorOr<List<ActivityExpensesDto>>>;

    // New DTOs
    public record ActivityExpensesDto(
        int ActivityId,
        string ActivityTitle,
        decimal TotalExpense,
        List<ExpenseDto> Expenses
    );

    public class GetExpenseByIdQueryHandler : IRequestHandler<GetExpenseByIdQuery, ErrorOr<ExpenseDto>>
    {
        private readonly IRepository<Expense> _expenseRepository;

        public GetExpenseByIdQueryHandler(IRepository<Expense> expenseRepository)
        {
            _expenseRepository = expenseRepository;
        }

        public async Task<ErrorOr<ExpenseDto>> Handle(GetExpenseByIdQuery request, CancellationToken cancellationToken)
        {
            var expense = await _expenseRepository.Query()
                .Include(e => e.CreatedByMember)
                .FirstOrDefaultAsync(e => e.Id == request.ExpenseId && !e.IsDeleted, cancellationToken);

            if (expense == null)
            {
                return Error.NotFound("Expense.NotFound", "Expense not found.");
            }

            return expense.ToDto();
        }
    }

    public class GetExpensesByTripQueryHandler : IRequestHandler<GetExpensesByTripQuery, ErrorOr<List<ExpenseDto>>>
    {
        private readonly IRepository<Expense> _expenseRepository;

        public GetExpensesByTripQueryHandler(IRepository<Expense> expenseRepository)
        {
            _expenseRepository = expenseRepository;
        }

        public async Task<ErrorOr<List<ExpenseDto>>> Handle(GetExpensesByTripQuery request, CancellationToken cancellationToken)
        {
            var expenses = await _expenseRepository.Query()
                .Include(e => e.CreatedByMember)
                .Include(e => e.TripActivity)
                    .ThenInclude(a => a.TripDay)
                .Where(e => e.TripActivity.TripDay.TripId == request.TripId && !e.IsDeleted)
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync(cancellationToken);

            return expenses.Select(e => e.ToDto()).ToList();
        }
    }

    public class GetTotalExpenseByTripQueryHandler : IRequestHandler<GetTotalExpenseByTripQuery, ErrorOr<ExpenseTotalDto>>
    {
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<Trip> _tripRepository;

        public GetTotalExpenseByTripQueryHandler(IRepository<Expense> expenseRepository, IRepository<Trip> tripRepository)
        {
            _expenseRepository = expenseRepository;
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<ExpenseTotalDto>> Handle(GetTotalExpenseByTripQuery request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetAsync(request.TripId, cancellationToken);
            
            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            var expenses = await _expenseRepository.Query()
                .Include(e => e.TripActivity)
                    .ThenInclude(a => a.TripDay)
                .Where(e => e.TripActivity.TripDay.TripId == request.TripId && !e.IsDeleted)
                .ToListAsync(cancellationToken);

            var totalAmount = expenses.Sum(e => e.TotalAmount);
            var count = expenses.Count;

            return new ExpenseTotalDto(request.TripId, totalAmount, trip.Currency, count);
        }
    }

    public class AggregateExpensesByTimelineQueryHandler : IRequestHandler<AggregateExpensesByTimelineQuery, ErrorOr<List<ExpenseByTimelineDto>>>
    {
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<Trip> _tripRepository;

        public AggregateExpensesByTimelineQueryHandler(IRepository<Expense> expenseRepository, IRepository<Trip> tripRepository)
        {
            _expenseRepository = expenseRepository;
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<List<ExpenseByTimelineDto>>> Handle(AggregateExpensesByTimelineQuery request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetAsync(request.TripId, cancellationToken);
            
            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            var results = await _expenseRepository.Query()
                .Include(e => e.TripActivity)
                    .ThenInclude(a => a.TripDay)
                .Where(e => e.TripActivity.TripDay.TripId == request.TripId && !e.IsDeleted)
                .GroupBy(e => new { e.TripActivityId, e.TripActivity.Title, e.TripActivity.TripDay.DayNumber })
                .Select(g => new ExpenseByTimelineDto(
                    g.Key.TripActivityId,
                    g.Key.Title,
                    g.Key.DayNumber,
                    g.Sum(e => e.TotalAmount),
                    trip.Currency,
                    g.Count()
                ))
                .OrderBy(x => x.DayNumber)
                .ToListAsync(cancellationToken);

            return results;
        }
    }

    public class GetExpensesGroupedByActivityQueryHandler : IRequestHandler<GetExpensesGroupedByActivityQuery, ErrorOr<List<ActivityExpensesDto>>>
    {
        private readonly IRepository<Expense> _expenseRepository;

        public GetExpensesGroupedByActivityQueryHandler(IRepository<Expense> expenseRepository)
        {
            _expenseRepository = expenseRepository;
        }

        public async Task<ErrorOr<List<ActivityExpensesDto>>> Handle(GetExpensesGroupedByActivityQuery request, CancellationToken cancellationToken)
        {
            var expenses = await _expenseRepository.Query()
                .Include(e => e.CreatedByMember)
                .Include(e => e.TripActivity)
                    .ThenInclude(a => a.TripDay)
                .Where(e => e.TripActivity.TripDay.TripId == request.TripId && !e.IsDeleted)
                .OrderBy(e => e.CreatedAt)
                .ToListAsync(cancellationToken);

            var grouped = expenses
                .GroupBy(e => new { e.TripActivityId, Title = e.TripActivity.Title })
                .Select(g => new ActivityExpensesDto(
                    g.Key.TripActivityId,
                    g.Key.Title,
                    g.Sum(e => e.TotalAmount),
                    g.Select(e => e.ToDto()).ToList()
                ))
                .ToList();

            return grouped;
        }
    }
}
