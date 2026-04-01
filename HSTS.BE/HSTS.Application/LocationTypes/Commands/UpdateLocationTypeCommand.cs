using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using ErrorOr;
using MediatR;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Commands
{
    public record UpdateLocationTypeCommand(int Id, string Name, string? Description = null)
        : IRequest<ErrorOr<LocationTypeDto>>;

    public class UpdateLocationTypeCommandHandler : IRequestHandler<UpdateLocationTypeCommand, ErrorOr<LocationTypeDto>>
    {
        private readonly IRepository<LocationType> _repository;

        public UpdateLocationTypeCommandHandler(IRepository<LocationType> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<LocationTypeDto>> Handle(UpdateLocationTypeCommand request, CancellationToken cancellationToken)
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

            // Check for duplicate name (ignoring soft-deleted records and current record)
            var existingLocationType = await _repository.Query()
                .FirstOrDefaultAsync(x => x.Name == request.Name && !x.IsDeleted && x.Id != request.Id, cancellationToken);

            if (existingLocationType != null)
            {
                return Error.Conflict(
                    "LocationType.DuplicateName",
                    $"A location type with the name '{request.Name}' already exists.");
            }

            // Update properties
            locationType.Name = request.Name;
            locationType.Description = request.Description;
            locationType.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(locationType, cancellationToken);

            return locationType.ToDto();
        }
    }
}
