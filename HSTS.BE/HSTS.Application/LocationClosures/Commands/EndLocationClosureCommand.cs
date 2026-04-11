using ErrorOr;
using MediatR;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.LocationClosures;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationClosures.Commands
{
    /// <summary>
    /// Command to end a location closure (deactivate it).
    /// This sets IsActive = false and restores location status to Active.
    /// </summary>
    public record EndLocationClosureCommand(int Id, int? UserId = null) : IRequest<ErrorOr<LocationClosureDto>>;

    public class EndLocationClosureCommandHandler : IRequestHandler<EndLocationClosureCommand, ErrorOr<LocationClosureDto>>
    {
        private readonly IRepository<LocationClosure> _closureRepository;
        private readonly IRepository<Location> _locationRepository;
        private readonly ICurrentUserService _currentUser;

        public EndLocationClosureCommandHandler(
            IRepository<LocationClosure> closureRepository,
            IRepository<Location> locationRepository,
            ICurrentUserService currentUser)
        {
            _closureRepository = closureRepository;
            _locationRepository = locationRepository;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<LocationClosureDto>> Handle(EndLocationClosureCommand request, CancellationToken cancellationToken)
        {
            var closure = await _closureRepository.GetAsync(request.Id, cancellationToken);
            if (closure == null || closure.IsDeleted)
            {
                return Error.NotFound("Closure.NotFound", $"Closure with ID {request.Id} not found.");
            }

            if (!closure.IsActive)
            {
                return Error.Conflict("Closure.AlreadyInactive", "This closure is already inactive.");
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
                        $"You can only end closures for your own locations. Location {closure.LocationId} belongs to user {location.OwnerId}.");
                }
            }

            closure.IsActive = false;
            closure.UpdatedBy = _currentUser.UserId.ToString();
            closure.UpdatedAt = DateTime.UtcNow;

            // Note: Location.Status is NOT modified here
            // EffectiveStatus is computed on-the-fly when querying based on reference date
            // Setting IsActive = false will automatically exclude this closure from effective status calculation

            await _closureRepository.UpdateAsync(closure, cancellationToken);

            return closure.ToDto();
        }
    }
}
