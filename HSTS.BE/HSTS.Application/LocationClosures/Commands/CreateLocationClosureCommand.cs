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
    public record CreateLocationClosureCommand(
        int LocationId,
        DateTime StartDate,
        DateTime EndDate,
        string? Reason,
        int? UserId = null  // For ownership validation (PARTNERS only)
    ) : IRequest<ErrorOr<LocationClosureDto>>;

    public class CreateLocationClosureCommandHandler : IRequestHandler<CreateLocationClosureCommand, ErrorOr<LocationClosureDto>>
    {
        private readonly IRepository<LocationClosure> _closureRepository;
        private readonly IRepository<Location> _locationRepository;
        private readonly ICurrentUserService _currentUser;

        public CreateLocationClosureCommandHandler(
            IRepository<LocationClosure> closureRepository,
            IRepository<Location> locationRepository,
            ICurrentUserService currentUser)
        {
            _closureRepository = closureRepository;
            _locationRepository = locationRepository;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<LocationClosureDto>> Handle(CreateLocationClosureCommand request, CancellationToken cancellationToken)
        {
            // Validate location exists
            var location = await _locationRepository.GetAsync(request.LocationId, cancellationToken);
            if (location == null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.LocationId} not found.");
            }

            // Only validate ownership if UserId is provided (PARTNER users)
            // ADMIN and CONTENT_MODERATOR don't pass UserId, so they skip this check
            if (request.UserId.HasValue)
            {
                if (request.UserId.Value != location.OwnerId)
                {
                    return Error.Forbidden("Closure.NotOwner", 
                        $"You can only create closures for your own locations. Location {request.LocationId} belongs to user {location.OwnerId}.");
                }
            }

            // Validate date range
            if (request.StartDate > request.EndDate)
            {
                return Error.Validation("Closure.InvalidDateRange", "Start date must be before or equal to end date.");
            }

            // Check for overlapping active closures
            var hasOverlap = await _closureRepository.Query()
                .AnyAsync(c => 
                    c.LocationId == request.LocationId &&
                    c.IsActive &&
                    !c.IsDeleted &&
                    c.StartDate <= request.EndDate &&
                    c.EndDate >= request.StartDate,
                    cancellationToken);

            if (hasOverlap)
            {
                return Error.Conflict("Closure.Overlapping", "An active closure already exists for this location that overlaps with the requested date range.");
            }

            var closure = new LocationClosure
            {
                LocationId = request.LocationId,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Reason = request.Reason,
                IsActive = true,
                CreatedBy = _currentUser.UserId.ToString()
            };

            await _closureRepository.AddAsync(closure, cancellationToken);
            await _closureRepository.UpdateAsync(closure, cancellationToken);

            // Note: Location.Status is NOT modified here
            // EffectiveStatus is computed on-the-fly when querying based on reference date

            return closure.ToDto();
        }
    }

    public class CreateLocationClosureCommandValidator : AbstractValidator<CreateLocationClosureCommand>
    {
        public CreateLocationClosureCommandValidator()
        {
            RuleFor(x => x.LocationId).NotEmpty().WithMessage("Location ID is required.");
            RuleFor(x => x.StartDate).NotEmpty().WithMessage("Start date is required.");
            RuleFor(x => x.EndDate).NotEmpty().WithMessage("End date is required.");
            RuleFor(x => x.Reason).MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Reason));
            
            // Validate date range at the validator level too
            RuleFor(x => x.EndDate)
                .GreaterThanOrEqualTo(x => x.StartDate)
                .WithMessage("End date must be greater than or equal to start date.");
        }
    }
}
