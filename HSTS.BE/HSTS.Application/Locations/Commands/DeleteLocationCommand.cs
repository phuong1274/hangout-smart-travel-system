using ErrorOr;
using MediatR;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Commands
{
    public record DeleteLocationCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteLocationCommandHandler : IRequestHandler<DeleteLocationCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<Location> _locationRepository;
        private readonly IRepository<LocationMedia> _mediaRepository;

        public DeleteLocationCommandHandler(
            IRepository<Location> locationRepository,
            IRepository<LocationMedia> mediaRepository)
        {
            _locationRepository = locationRepository;
            _mediaRepository = mediaRepository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteLocationCommand request, CancellationToken cancellationToken)
        {
            var location = await _locationRepository.GetAsync(request.Id, cancellationToken);

            if (location == null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.Id} not found.");
            }

            // Soft-delete the location
            location.IsDeleted = true;
            await _locationRepository.UpdateAsync(location, cancellationToken);

            // Soft-delete all associated media
            var medias = await _mediaRepository.Query()
                .Where(m => m.LocationId == request.Id && !m.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var media in medias)
            {
                media.IsDeleted = true;
                await _mediaRepository.UpdateAsync(media, cancellationToken);
            }

            return Result.Deleted;
        }
    }
}
