using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using ErrorOr;
using MediatR;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Commands
{
    public record DeleteLocationTypeCommand(int Id)
        : IRequest<ErrorOr<Success>>;

    public class DeleteLocationTypeCommandHandler : IRequestHandler<DeleteLocationTypeCommand, ErrorOr<Success>>
    {
        private readonly IRepository<LocationType> _repository;
        private readonly IRepository<Location> _locationRepository;

        public DeleteLocationTypeCommandHandler(
            IRepository<LocationType> repository,
            IRepository<Location> locationRepository)
        {
            _repository = repository;
            _locationRepository = locationRepository;
        }

        public async Task<ErrorOr<Success>> Handle(DeleteLocationTypeCommand request, CancellationToken cancellationToken)
        {
            // Find the location type (excluding soft-deleted)
            var locationType = await _repository.Query()
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, cancellationToken);

            if (locationType == null)
            {
                return Error.NotFound(
                    "LocationType.NotFound",
                    $"Location type with ID {request.Id} not found.");
            }

            // Check if any active locations are using this type
            var isInUse = await _locationRepository.Query()
                .AnyAsync(l => l.LocationTypeId == request.Id && !l.IsDeleted, cancellationToken);

            if (isInUse)
            {
                return Error.Validation(
                    "LocationType.InUse",
                    "Cannot delete location type with active locations.");
            }

            // Soft delete - set IsDeleted flag
            locationType.IsDeleted = true;
            locationType.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(locationType, cancellationToken);

            return Result.Success;
        }
    }
}
