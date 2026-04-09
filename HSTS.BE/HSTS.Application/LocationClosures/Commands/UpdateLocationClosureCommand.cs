using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.LocationClosures;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationClosures.Commands
{
    public record UpdateLocationClosureCommand(
        int Id,
        DateTime StartDate,
        DateTime EndDate,
        string? Reason,
        bool IsActive,
        int? UserId = null  // For ownership validation (PARTNERS only)
    ) : IRequest<ErrorOr<LocationClosureDto>>;

    public class UpdateLocationClosureCommandHandler : IRequestHandler<UpdateLocationClosureCommand, ErrorOr<LocationClosureDto>>
    {
        private readonly IRepository<LocationClosure> _closureRepository;
        private readonly IRepository<Location> _locationRepository;
        private readonly ICurrentUserService _currentUser;

        public UpdateLocationClosureCommandHandler(
            IRepository<LocationClosure> closureRepository,
            IRepository<Location> locationRepository,
            ICurrentUserService currentUser)
        {
            _closureRepository = closureRepository;
            _locationRepository = locationRepository;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<LocationClosureDto>> Handle(UpdateLocationClosureCommand request, CancellationToken cancellationToken)
        {
            var closure = await _closureRepository.GetAsync(request.Id, cancellationToken);
            if (closure == null || closure.IsDeleted)
            {
                return Error.NotFound("Closure.NotFound", $"Closure with ID {request.Id} not found.");
            }

            // Validate location exists
            var location = await _locationRepository.GetAsync(closure.LocationId, cancellationToken);
            if (location == null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location associated with this closure was not found.");
            }

            // Only validate ownership if UserId is provided (PARTNER users)
            // ADMIN and CONTENT_MODERATOR don't pass UserId, so they skip this check
            if (request.UserId.HasValue)
            {
                if (request.UserId.Value != location.OwnerId)
                {
                    return Error.Forbidden("Closure.NotOwner", 
                        $"You can only update closures for your own locations. Location {closure.LocationId} belongs to user {location.OwnerId}.");
                }
            }

            // Validate date range
            if (request.StartDate > request.EndDate)
            {
                return Error.Validation("Closure.InvalidDateRange", "Start date must be before or equal to end date.");
            }

            // Check for overlapping active closures (excluding current closure)
            var hasOverlap = await _closureRepository.Query()
                .AnyAsync(c => 
                    c.LocationId == closure.LocationId &&
                    c.IsActive &&
                    !c.IsDeleted &&
                    c.Id != request.Id &&
                    c.StartDate <= request.EndDate &&
                    c.EndDate >= request.StartDate,
                    cancellationToken);


            if (hasOverlap)
            {
                return Error.Conflict("Closure.Overlapping", "Another active closure already exists for this location that overlaps with the requested date range.");
            }

            closure.StartDate = request.StartDate;
            closure.EndDate = request.EndDate;
            closure.Reason = request.Reason;
            closure.IsActive = request.IsActive;
            closure.UpdatedBy = _currentUser.UserId.ToString();
            closure.UpdatedAt = DateTime.UtcNow;

            await _closureRepository.UpdateAsync(closure, cancellationToken);

            return closure.ToDto();
        }
    }

    public class UpdateLocationClosureCommandValidator : AbstractValidator<UpdateLocationClosureCommand>
    {
        public UpdateLocationClosureCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty().WithMessage("Closure ID is required.");
            RuleFor(x => x.StartDate).NotEmpty().WithMessage("Start date is required.");
            RuleFor(x => x.EndDate).NotEmpty().WithMessage("End date is required.");
            RuleFor(x => x.Reason).MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Reason));
            
            RuleFor(x => x.EndDate)
                .GreaterThanOrEqualTo(x => x.StartDate)
                .WithMessage("End date must be greater than or equal to start date.");
        }
    }
}
