using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using ErrorOr;
using MediatR;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Commands
{
    public record CreateLocationTypeCommand(string Name, string? Description = null)
        : IRequest<ErrorOr<LocationTypeDto>>;

    public class CreateLocationTypeCommandHandler : IRequestHandler<CreateLocationTypeCommand, ErrorOr<LocationTypeDto>>
    {
        private readonly IRepository<LocationType> _repository;

        public CreateLocationTypeCommandHandler(IRepository<LocationType> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<LocationTypeDto>> Handle(CreateLocationTypeCommand request, CancellationToken cancellationToken)
        {
            // Check for duplicate name (ignoring soft-deleted records)
            var existingLocationType = await _repository.Query()
                .FirstOrDefaultAsync(x => x.Name == request.Name && !x.IsDeleted, cancellationToken);

            if (existingLocationType != null)
            {
                return Error.Conflict(
                    "LocationType.DuplicateName",
                    $"A location type with the name '{request.Name}' already exists.");
            }

            var locationType = new LocationType
            {
                Name = request.Name,
                Description = request.Description
            };

            await _repository.AddAsync(locationType, cancellationToken);

            return locationType.ToDto();
        }
    }
}
