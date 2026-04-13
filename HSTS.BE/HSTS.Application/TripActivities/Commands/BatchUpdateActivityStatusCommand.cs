using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.TripActivities.Commands
{
    public record BatchActivityStatusResult(
        int CompletedCount,
        int StartedCount,
        List<string> Errors
    );

    public record BatchUpdateActivityStatusCommand(
        List<int> ActivityIdsToComplete,
        int ActivityIdToStart
    ) : IRequest<ErrorOr<BatchActivityStatusResult>>;

    public class BatchUpdateActivityStatusCommandHandler : IRequestHandler<BatchUpdateActivityStatusCommand, ErrorOr<BatchActivityStatusResult>>
    {
        private readonly IAppDbContext _context;

        public BatchUpdateActivityStatusCommandHandler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<ErrorOr<BatchActivityStatusResult>> Handle(BatchUpdateActivityStatusCommand request, CancellationToken cancellationToken)
        {
            var errors = new List<string>();

            // Validate all activity IDs exist
            var allIds = request.ActivityIdsToComplete.Concat(new[] { request.ActivityIdToStart }).Distinct().ToList();
            var existingActivities = await _context.TripActivities
                .Where(a => allIds.Contains(a.Id))
                .ToListAsync(cancellationToken);

            var existingIds = existingActivities.Select(a => a.Id).ToHashSet();
            var missingIds = allIds.Except(existingIds).ToList();

            if (missingIds.Any())
            {
                return Error.NotFound("TripActivity.NotFound", $"Trip activities not found: {string.Join(", ", missingIds)}");
            }

            var activityLookup = existingActivities.ToDictionary(a => a.Id);
            var activityToStart = activityLookup[request.ActivityIdToStart];

            // Get the trip via the activity's TripDay
            var tripDay = await _context.TripDays
                .FirstOrDefaultAsync(td => td.Id == activityToStart.TripDayId, cancellationToken);

            if (tripDay == null)
            {
                return Error.NotFound("TripDay.NotFound", "Trip day not found.");
            }

            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == tripDay.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            using var transaction = await _context.BeginTransactionAsync(cancellationToken);

            try
            {
                // 1. Ensure trip is Active when starting any activity
                if (trip.Status != TripStatus.InProgress)
                {
                    trip.Status = TripStatus.InProgress;
                    _context.Trips.Update(trip);
                }

                // 2. Complete all previous activities
                foreach (var activityId in request.ActivityIdsToComplete)
                {
                    var activity = activityLookup[activityId];
                    activity.Status = TripActivityStatus.Completed;
                    _context.TripActivities.Update(activity);
                }

                // 3. Start the current activity
                activityToStart.Status = TripActivityStatus.InProgress;
                _context.TripActivities.Update(activityToStart);

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return new BatchActivityStatusResult(
                    request.ActivityIdsToComplete.Count,
                    1,
                    errors
                );
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                return Error.Failure("BatchUpdate.Failed", $"Failed to batch update activities: {ex.Message}");
            }
        }
    }

    public class BatchUpdateActivityStatusCommandValidator : AbstractValidator<BatchUpdateActivityStatusCommand>
    {
        public BatchUpdateActivityStatusCommandValidator()
        {
            RuleFor(x => x.ActivityIdsToComplete)
                .NotNull()
                .WithMessage("Activity IDs to complete cannot be null.");
            RuleFor(x => x.ActivityIdsToComplete)
                .Must(ids => ids.All(id => id > 0))
                .WithMessage("All activity IDs must be greater than 0.");
            RuleFor(x => x.ActivityIdToStart)
                .GreaterThan(0)
                .WithMessage("Activity ID to start must be greater than 0.");
        }
    }
}
