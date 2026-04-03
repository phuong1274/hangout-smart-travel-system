using ErrorOr;
using MediatR;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Amenities.Commands
{
    public record DeleteAmenityCommand(int Id) : IRequest<ErrorOr<Unit>>;

    public class DeleteAmenityCommandHandler : IRequestHandler<DeleteAmenityCommand, ErrorOr<Unit>>
    {
        private readonly IRepository<Amenity> _amenityRepository;
        private readonly IRepository<LocationAmenity> _locationAmenityRepository;

        public DeleteAmenityCommandHandler(IRepository<Amenity> amenityRepository, IRepository<LocationAmenity> locationAmenityRepository)
        {
            _amenityRepository = amenityRepository;
            _locationAmenityRepository = locationAmenityRepository;
        }

        public async Task<ErrorOr<Unit>> Handle(DeleteAmenityCommand request, CancellationToken cancellationToken)
        {
            var amenity = await _amenityRepository.GetAsync(request.Id, cancellationToken);

            if (amenity == null || amenity.IsDeleted)
            {
                return Error.NotFound("Amenity.NotFound", $"Amenity with ID {request.Id} was not found.");
            }

            // Check if amenity is in use by any location
            var isInUse = await _locationAmenityRepository.Query()
                .AnyAsync(la => la.AmenityId == request.Id && !la.IsDeleted, cancellationToken);

            if (isInUse)
            {
                return Error.Validation("Amenity.InUse", "Cannot delete amenity that is currently in use by one or more locations.");
            }

            amenity.IsDeleted = true;
            amenity.UpdatedAt = DateTime.UtcNow;

            await _amenityRepository.UpdateAsync(amenity, cancellationToken);

            return Unit.Value;
        }
    }
}
