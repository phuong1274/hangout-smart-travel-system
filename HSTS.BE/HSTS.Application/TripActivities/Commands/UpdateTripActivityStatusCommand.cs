using ErrorOr;
using FluentValidation;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TripActivities.Commands
{
    public record TripActivityStatusDto(int Id, string Title, ActivityType Type, TripActivityStatus Status);

    public record UpdateTripActivityStatusCommand(
        int ActivityId,
        TripActivityStatus? Status = null
    ) : IRequest<ErrorOr<TripActivityStatusDto>>;

    public class UpdateTripActivityStatusCommandHandler : IRequestHandler<UpdateTripActivityStatusCommand, ErrorOr<TripActivityStatusDto>>
    {
        private readonly IRepository<TripActivity> _activityRepository;

        public UpdateTripActivityStatusCommandHandler(IRepository<TripActivity> activityRepository)
        {
            _activityRepository = activityRepository;
        }

        public async Task<ErrorOr<TripActivityStatusDto>> Handle(UpdateTripActivityStatusCommand request, CancellationToken cancellationToken)
        {
            var activity = await _activityRepository.GetAsync(request.ActivityId, cancellationToken);

            if (activity == null)
            {
                return Error.NotFound("TripActivity.NotFound", $"Trip activity with ID {request.ActivityId} not found.");
            }

            // If no status provided, auto-determine based on current time vs activity schedule
            if (request.Status == null)
            {
                var tripDay = await _activityRepository.Query()
                    .Where(a => a.Id == activity.Id)
                    .Select(a => a.TripDay)
                    .FirstOrDefaultAsync(cancellationToken);

                if (tripDay == null)
                {
                    return Error.NotFound("TripDay.NotFound", "Associated trip day not found.");
                }

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

            await _activityRepository.UpdateAsync(activity, cancellationToken);

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
