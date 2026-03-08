using ErrorOr;
using MediatR;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Commands
{
    public record DeleteLocationTypeCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteLocationTypeCommandHandler : IRequestHandler<DeleteLocationTypeCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<LocationType> _repository;
        private readonly IRepository<Location> _locationRepository;

        public DeleteLocationTypeCommandHandler(IRepository<LocationType> repository, IRepository<Location> locationRepository)
        {
            _repository = repository;
            _locationRepository = locationRepository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteLocationTypeCommand request, CancellationToken cancellationToken)
        {
            var locationType = await _repository.GetAsync(request.Id, cancellationToken);

            if (locationType == null || locationType.IsDeleted)
            {
                return Error.NotFound("LocationType.NotFound", "Location type not found.");
            }

            // Check if location type is in use by any location
            var isInUse = await _locationRepository.Query()
                .AnyAsync(l => l.LocationTypeId == request.Id && !l.IsDeleted, cancellationToken);

            if (isInUse)
            {
                return Error.Validation("LocationType.InUse", "Cannot delete location type that is currently in use by one or more locations.");
            }

            locationType.IsDeleted = true;

            await _repository.UpdateAsync(locationType, cancellationToken);

            return Result.Deleted;
        }
    }
}
