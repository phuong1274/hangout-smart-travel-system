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
        string CreatedByUserId
    ) : IRequest<ErrorOr<ExpenseDto>>;

    public record UpdateExpenseCommand(
        int ExpenseId,
        string Title,
        string? Description,
        decimal TotalAmount,
        string UpdatedByUserId
    ) : IRequest<ErrorOr<ExpenseDto>>;

    public record DeleteExpenseCommand(int ExpenseId, int CurrentUserId) : IRequest<ErrorOr<Success>>;

    public class CreateExpenseCommandValidator : AbstractValidator<CreateExpenseCommand>
    {
        public CreateExpenseCommandValidator()
        {
            RuleFor(x => x.TripActivityId).GreaterThan(0);
            RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
            RuleFor(x => x.TotalAmount).GreaterThan(0);
            RuleFor(x => x.CreatedByUserId).NotEmpty();
        }
    }

    public class UpdateExpenseCommandValidator : AbstractValidator<UpdateExpenseCommand>
    {
        public UpdateExpenseCommandValidator()
        {
            RuleFor(x => x.ExpenseId).GreaterThan(0);
            RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
            RuleFor(x => x.TotalAmount).GreaterThan(0);
            RuleFor(x => x.UpdatedByUserId).NotEmpty();
        }
    }

    public class CreateExpenseCommandHandler : IRequestHandler<CreateExpenseCommand, ErrorOr<ExpenseDto>>
    {
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<User> _userRepository;
        private readonly IRepository<TripMember> _memberRepository;
        private readonly IRepository<TripActivity> _activityRepository;
        private readonly IRepository<TripDay> _tripDayRepository;
        private readonly IRepository<Trip> _tripRepository;

        public CreateExpenseCommandHandler(
            IRepository<Expense> expenseRepository,
            IRepository<User> userRepository,
            IRepository<TripMember> memberRepository,
            IRepository<TripActivity> activityRepository,
            IRepository<TripDay> tripDayRepository,
            IRepository<Trip> tripRepository)
        {
            _expenseRepository = expenseRepository;
            _userRepository = userRepository;
            _memberRepository = memberRepository;
            _activityRepository = activityRepository;
            _tripDayRepository = tripDayRepository;
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<ExpenseDto>> Handle(CreateExpenseCommand request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetAsync(int.Parse(request.CreatedByUserId), cancellationToken);
            if (user == null)
            {
                return Error.NotFound("Expense.UserNotFound", "User not found.");
            }

            // Find the activity to get trip and check user's role
            var activity = await _activityRepository.GetAsync(request.TripActivityId, cancellationToken);
            if (activity == null)
            {
                return Error.NotFound("Expense.ActivityNotFound", "Trip activity not found.");
            }

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

            // Check user's role in this trip
            var member = await _memberRepository.Query()
                .FirstOrDefaultAsync(m => m.TripId == trip.Id && m.UserId == user.Id, cancellationToken);

            if (member == null || (member.Role != TripRole.Treasurer && member.Role != TripRole.Leader))
            {
                return Error.Forbidden("Expense.NotAuthorized", "Only TREASURER or LEADER can create expenses.");
            }

            // Lock expense creation 2 days after trip ends
            if (DateTime.UtcNow.Date > trip.EndDate.Date.AddDays(2))
            {
                return Error.Validation("Expense.TripLocked", "Cannot add expenses. The trip ended more than 2 days ago.");
            }

            // Prevent logging expense for activities that haven't started
            if (activity.Status == TripActivityStatus.Upcoming)
            {
                return Error.Validation("Expense.ActivityNotStarted", "Cannot add expenses for an activity that hasn't started. Start the activity first.");
            }

            var expense = new Expense
            {
                TripActivityId = request.TripActivityId,
                Title = request.Title,
                Description = request.Description,
                TotalAmount = request.TotalAmount,
                CreatedBy = request.CreatedByUserId
            };

            await _expenseRepository.AddAsync(expense, cancellationToken);

            return expense.ToDto(user.FullName, null);
        }
    }

    public class UpdateExpenseCommandHandler : IRequestHandler<UpdateExpenseCommand, ErrorOr<ExpenseDto>>
    {
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<User> _userRepository;
        private readonly IRepository<TripMember> _memberRepository;
        private readonly IRepository<TripActivity> _activityRepository;
        private readonly IRepository<TripDay> _tripDayRepository;
        private readonly IRepository<Trip> _tripRepository;

        public UpdateExpenseCommandHandler(
            IRepository<Expense> expenseRepository,
            IRepository<User> userRepository,
            IRepository<TripMember> memberRepository,
            IRepository<TripActivity> activityRepository,
            IRepository<TripDay> tripDayRepository,
            IRepository<Trip> tripRepository)
        {
            _expenseRepository = expenseRepository;
            _userRepository = userRepository;
            _memberRepository = memberRepository;
            _activityRepository = activityRepository;
            _tripDayRepository = tripDayRepository;
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<ExpenseDto>> Handle(UpdateExpenseCommand request, CancellationToken cancellationToken)
        {
            var expense = await _expenseRepository.GetAsync(request.ExpenseId, cancellationToken);

            if (expense == null)
            {
                return Error.NotFound("Expense.NotFound", "Expense not found.");
            }

            var user = await _userRepository.GetAsync(int.Parse(request.UpdatedByUserId), cancellationToken);
            if (user == null)
            {
                return Error.NotFound("Expense.UserNotFound", "User not found.");
            }

            // Find the activity to get trip and check user's role
            var activity = await _activityRepository.Query()
                .Include(a => a.TripDay)
                .FirstOrDefaultAsync(a => a.Id == expense.TripActivityId, cancellationToken);

            if (activity?.TripDay == null)
            {
                return Error.NotFound("Expense.ActivityNotFound", "Trip activity not found.");
            }

            var member = await _memberRepository.Query()
                .FirstOrDefaultAsync(m => m.TripId == activity.TripDay.TripId && m.UserId == user.Id, cancellationToken);

            if (member == null || (member.Role != TripRole.Treasurer && member.Role != TripRole.Leader))
            {
                return Error.Forbidden("Expense.NotAuthorized", "Only TREASURER or LEADER can update expenses.");
            }

            // Get trip to check end date lock
            var trip = await _tripRepository.GetAsync(activity.TripDay.TripId, cancellationToken);
            if (trip != null && DateTime.UtcNow.Date > trip.EndDate.Date.AddDays(2))
            {
                return Error.Validation("Expense.TripLocked", "Cannot update expenses. The trip ended more than 2 days ago.");
            }

            // Prevent editing expenses for activities that haven't started
            if (activity.Status == TripActivityStatus.Upcoming)
            {
                return Error.Validation("Expense.ActivityNotStarted", "Cannot edit expenses for an activity that hasn't started.");
            }

            expense.Title = request.Title;
            expense.Description = request.Description;
            expense.TotalAmount = request.TotalAmount;
            expense.UpdatedBy = request.UpdatedByUserId;

            await _expenseRepository.UpdateAsync(expense, cancellationToken);

            return expense.ToDto(user.FullName, user.FullName);
        }
    }

    public class DeleteExpenseCommandHandler : IRequestHandler<DeleteExpenseCommand, ErrorOr<Success>>
    {
        private readonly IRepository<Expense> _expenseRepository;
        private readonly IRepository<TripMember> _memberRepository;
        private readonly IRepository<TripActivity> _activityRepository;
        private readonly IRepository<TripDay> _tripDayRepository;
        private readonly IRepository<Trip> _tripRepository;

        public DeleteExpenseCommandHandler(
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

        public async Task<ErrorOr<Success>> Handle(DeleteExpenseCommand request, CancellationToken cancellationToken)
        {
            var expense = await _expenseRepository.GetAsync(request.ExpenseId, cancellationToken);

            if (expense == null)
            {
                return Error.NotFound("Expense.NotFound", "Expense not found.");
            }

            // Get the current user's trip membership to check their role
            var activity = await _activityRepository.Query()
                .Include(a => a.TripDay)
                .FirstOrDefaultAsync(a => a.Id == expense.TripActivityId, cancellationToken);

            if (activity?.TripDay == null)
            {
                return Error.NotFound("Expense.ActivityNotFound", "Trip activity not found.");
            }

            var currentUsersMemberRole = await _memberRepository.Query()
                .FirstOrDefaultAsync(m => m.TripId == activity.TripDay.TripId && m.UserId == request.CurrentUserId, cancellationToken);

            if (currentUsersMemberRole == null)
            {
                return Error.Forbidden("Expense.NotAuthorized", "You are not a member of this trip.");
            }

            if (currentUsersMemberRole.Role != TripRole.Treasurer && currentUsersMemberRole.Role != TripRole.Leader)
            {
                return Error.Forbidden("Expense.NotAuthorized", "Only TREASURER or LEADER can delete expenses.");
            }

            // Get trip to check end date lock
            if (activity?.TripDay != null)
            {
                var trip = await _tripRepository.GetAsync(activity.TripDay.TripId, cancellationToken);
                if (trip != null && DateTime.UtcNow.Date > trip.EndDate.Date.AddDays(2))
                {
                    return Error.Validation("Expense.TripLocked", "Cannot delete expenses. The trip ended more than 2 days ago.");
                }

                // Prevent deleting expenses for activities that haven't started
                if (activity.Status == TripActivityStatus.Upcoming)
                {
                    return Error.Validation("Expense.ActivityNotStarted", "Cannot delete expenses for an activity that hasn't started.");
                }
            }

            expense.IsDeleted = true;
            await _expenseRepository.SoftDeleteAsync(expense, cancellationToken);

            return Result.Success;
        }
    }
}
