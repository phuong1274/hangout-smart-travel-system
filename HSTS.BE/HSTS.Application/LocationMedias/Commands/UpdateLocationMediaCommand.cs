using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationMedias.Commands
{
    public record UpdateLocationMediaCommand(List<string> Links, int LocationId) : IRequest<ErrorOr<List<LocationMediaDto>>>;

    public class UpdateLocationMediaCommandHandler : IRequestHandler<UpdateLocationMediaCommand, ErrorOr<List<LocationMediaDto>>>
    {
        private readonly IRepository<LocationMedia> _mediaRepository;
        private readonly IRepository<Location> _locationRepository;

        public UpdateLocationMediaCommandHandler(
            IRepository<LocationMedia> mediaRepository,
            IRepository<Location> locationRepository)
        {
            _mediaRepository = mediaRepository;
            _locationRepository = locationRepository;
        }

        public async Task<ErrorOr<List<LocationMediaDto>>> Handle(UpdateLocationMediaCommand request, CancellationToken cancellationToken)
        {
            var location = await _locationRepository.GetAsync(request.LocationId, cancellationToken);
            if (location == null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.LocationId} was not found.");
            }

            // Get all current media for this location (including soft-deleted to potentially restore)
            var currentMedia = await _mediaRepository.Query()
                .Where(x => x.LocationId == request.LocationId)
                .ToListAsync(cancellationToken);

            var activeMedia = currentMedia.Where(x => !x.IsDeleted).ToList();
            var requestedLinks = request.Links.Distinct().ToList();

            // 1. Identify links to soft-delete (exist in DB as active but missing in request)
            var toSoftDelete = activeMedia.Where(m => !requestedLinks.Contains(m.Link)).ToList();
            foreach (var media in toSoftDelete)
            {
                media.IsDeleted = true;
                media.UpdatedAt = DateTime.UtcNow;
                await _mediaRepository.UpdateAsync(media, cancellationToken);
            }

            // 2. Identify links to add or restore
            foreach (var link in requestedLinks)
            {
                var existing = currentMedia.FirstOrDefault(m => m.Link == link);
                
                if (existing == null)
                {
                    // Create new
                    await _mediaRepository.AddAsync(new LocationMedia
                    {
                        Link = link,
                        LocationId = request.LocationId
                    }, cancellationToken);
                }
                else if (existing.IsDeleted)
                {
                    // Restore
                    existing.IsDeleted = false;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _mediaRepository.UpdateAsync(existing, cancellationToken);
                }
                // If it exists and is active, do nothing
            }

            // Return the final state of active media
            var finalActiveMedia = await _mediaRepository.Query()
                .Where(x => x.LocationId == request.LocationId && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            return finalActiveMedia.Select(m => m.ToDto()).ToList();
        }
    }

    public class UpdateLocationMediaCommandValidator : AbstractValidator<UpdateLocationMediaCommand>
    {
        public UpdateLocationMediaCommandValidator()
        {
            RuleFor(x => x.Links).NotNull().WithMessage("Links list cannot be null.");
            RuleForEach(x => x.Links).NotEmpty().MaximumLength(2000);
            RuleFor(x => x.LocationId).NotEmpty();
        }
    }
}
