using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.TripActivities.Commands
{
    public record TripActivityStatusDto(int Id, string Title, ActivityType Type, TripActivityStatus Status);

    public record UpdateTripActivityStatusCommand(
        int ActivityId,
        TripActivityStatus? Status = null
    ) : IRequest<ErrorOr<TripActivityStatusDto>>;

    public class UpdateTripActivityStatusCommandHandler : IRequestHandler<UpdateTripActivityStatusCommand, ErrorOr<TripActivityStatusDto>>
    {
        private readonly IAppDbContext _context;

        public UpdateTripActivityStatusCommandHandler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<ErrorOr<TripActivityStatusDto>> Handle(UpdateTripActivityStatusCommand request, CancellationToken cancellationToken)
        {
            var activity = await _context.TripActivities
                .FirstOrDefaultAsync(a => a.Id == request.ActivityId, cancellationToken);

            if (activity == null)
            {
                return Error.NotFound("TripActivity.NotFound", $"Trip activity with ID {request.ActivityId} not found.");
            }

            var tripDay = await _context.TripDays
                .FirstOrDefaultAsync(td => td.Id == activity.TripDayId, cancellationToken);

            if (tripDay == null)
            {
                return Error.NotFound("TripDay.NotFound", "Associated trip day not found.");
            }

            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == tripDay.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            // If no status provided, auto-determine based on current time vs activity schedule
            if (request.Status == null)
            {
                var now = TimeOnly.FromDateTime(DateTime.Now);
                activity.Status = activity.StartTime.HasValue && activity.EndTime.HasValue
                    ? now >= activity.StartTime.Value && now <= activity.EndTime.Value
                        ? TripActivityStatus.InProgress
                        : now > activity.EndTime.Value
                            ? TripActivityStatus.Completed
                            : TripActivityStatus.Upcoming
                    : TripActivityStatus.Upcoming;
            }
            else
            {
                activity.Status = request.Status.Value;
            }

            // Determine the target status for this activity after the update
            var newActivityStatus = activity.Status;

            using var transaction = await _context.BeginTransactionAsync(cancellationToken);

            try
            {
                _context.TripActivities.Update(activity);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }

            return new TripActivityStatusDto(
                activity.Id,
                activity.Title,
                activity.Type,
                activity.Status
            );
        }
    }

    public class UpdateTripActivityStatusCommandValidator : AbstractValidator<UpdateTripActivityStatusCommand>
    {
        public UpdateTripActivityStatusCommandValidator()
        {
            RuleFor(x => x.ActivityId).GreaterThan(0).WithMessage("Activity ID must be greater than 0.");
            RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue).WithMessage("Invalid trip activity status.");
        }
    }
}
