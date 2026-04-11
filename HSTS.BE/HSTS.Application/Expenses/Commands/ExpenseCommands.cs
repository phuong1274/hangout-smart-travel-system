using ErrorOr;
using FluentValidation;
using HSTS.Application.Expenses;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Expenses.Commands
{
    public record CreateExpenseCommand(
        int TripActivityId,
        string Title,
        string? Description,
        decimal TotalAmount,
        int CreatedById
    ) : IRequest<ErrorOr<ExpenseDto>>;

    public record UpdateExpenseCommand(
        int ExpenseId,
        string Title,
        string? Description,
        decimal TotalAmount
    ) : IRequest<ErrorOr<ExpenseDto>>;

    public record DeleteExpenseCommand(int ExpenseId) : IRequest<ErrorOr<Success>>;

    public class CreateExpenseCommandValidator : AbstractValidator<CreateExpenseCommand>
    {
        public CreateExpenseCommandValidator()
        {
            RuleFor(x => x.TripActivityId).GreaterThan(0);
            RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
            RuleFor(x => x.TotalAmount).GreaterThan(0);
            RuleFor(x => x.CreatedById).GreaterThan(0);
        }
    }

    public class UpdateExpenseCommandValidator : AbstractValidator<UpdateExpenseCommand>
    {
        public UpdateExpenseCommandValidator()
        {
            RuleFor(x => x.ExpenseId).GreaterThan(0);
            RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
            RuleFor(x => x.TotalAmount).GreaterThan(0);
        }
    }

    public class CreateExpenseCommandHandler : IRequestHandler<CreateExpenseCommand, ErrorOr<ExpenseDto>>
    {
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<TripMember> _memberRepository;
        private readonly IRepository<TripActivity> _activityRepository;
        private readonly IRepository<TripDay> _tripDayRepository;
        private readonly IRepository<Trip> _tripRepository;

        public CreateExpenseCommandHandler(
            IRepository<Expense> expenseRepository,
            IRepository<TripMember> memberRepository,
            IRepository<TripActivity> activityRepository,
            IRepository<TripDay> tripDayRepository,
            IRepository<Trip> tripRepository)
        {
            _expenseRepository = expenseRepository;
            _memberRepository = memberRepository;
            _activityRepository = activityRepository;
            _tripDayRepository = tripDayRepository;
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<ExpenseDto>> Handle(CreateExpenseCommand request, CancellationToken cancellationToken)
        {
            var member = await _memberRepository.GetAsync(request.CreatedById, cancellationToken);
            if (member == null)
            {
                return Error.NotFound("Expense.MemberNotFound", "Trip member not found.");
            }

            if (member.Role != TripMemberRole.TREASURER)
            {
                return Error.Forbidden("Expense.NotTreasurer", "Only TREASURER can create expenses.");
            }

            var activity = await _activityRepository.GetAsync(request.TripActivityId, cancellationToken);
            if (activity == null)
            {
                return Error.NotFound("Expense.ActivityNotFound", "Trip activity not found.");
            }

            // Get currency from Trip
            var tripDay = await _tripDayRepository.Query()
                .FirstOrDefaultAsync(td => td.Id == activity.TripDayId, cancellationToken);
            
            if (tripDay == null)
            {
                return Error.NotFound("Expense.TripDayNotFound", "Trip day not found.");
            }

            var trip = await _tripRepository.GetAsync(tripDay.TripId, cancellationToken);
            if (trip == null)
            {
                return Error.NotFound("Expense.TripNotFound", "Trip not found.");
            }

            var expense = new Expense
            {
                TripActivityId = request.TripActivityId,
                Title = request.Title,
                Description = request.Description,
                TotalAmount = request.TotalAmount,
                CreatedById = request.CreatedById
            };

            await _expenseRepository.AddAsync(expense, cancellationToken);

            return expense.ToDto();
        }
    }

    public class UpdateExpenseCommandHandler : IRequestHandler<UpdateExpenseCommand, ErrorOr<ExpenseDto>>
    {
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<TripMember> _memberRepository;

        public UpdateExpenseCommandHandler(
            IRepository<Expense> expenseRepository,
            IRepository<TripMember> memberRepository)
        {
            _expenseRepository = expenseRepository;
            _memberRepository = memberRepository;
        }

        public async Task<ErrorOr<ExpenseDto>> Handle(UpdateExpenseCommand request, CancellationToken cancellationToken)
        {
            var expense = await _expenseRepository.Query()
                .Include(e => e.CreatedByMember)
                .FirstOrDefaultAsync(e => e.Id == request.ExpenseId, cancellationToken);

            if (expense == null)
            {
                return Error.NotFound("Expense.NotFound", "Expense not found.");
            }

            if (expense.CreatedByMember.Role != TripMemberRole.TREASURER)
            {
                return Error.Forbidden("Expense.NotTreasurer", "Only TREASURER can update expenses.");
            }

            expense.Title = request.Title;
            expense.Description = request.Description;
            expense.TotalAmount = request.TotalAmount;

            await _expenseRepository.UpdateAsync(expense, cancellationToken);

            return expense.ToDto();
        }
    }

    public class DeleteExpenseCommandHandler : IRequestHandler<DeleteExpenseCommand, ErrorOr<Success>>
    {
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<TripMember> _memberRepository;

        public DeleteExpenseCommandHandler(
            IRepository<Expense> expenseRepository,
            IRepository<TripMember> memberRepository)
        {
            _expenseRepository = expenseRepository;
            _memberRepository = memberRepository;
        }

        public async Task<ErrorOr<Success>> Handle(DeleteExpenseCommand request, CancellationToken cancellationToken)
        {
            var expense = await _expenseRepository.Query()
                .Include(e => e.CreatedByMember)
                .FirstOrDefaultAsync(e => e.Id == request.ExpenseId, cancellationToken);

            if (expense == null)
            {
                return Error.NotFound("Expense.NotFound", "Expense not found.");
            }

            if (expense.CreatedByMember.Role != TripMemberRole.TREASURER)
            {
                return Error.Forbidden("Expense.NotTreasurer", "Only TREASURER can delete expenses.");
            }

            await _expenseRepository.DeleteAsync(expense, cancellationToken);

            return Result.Success;
        }
    }
}
