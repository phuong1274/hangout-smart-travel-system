using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Amenities.Commands
{
    public record UpdateAmenityCommand(
        int Id,
        string Name,
        string? Description) : IRequest<ErrorOr<AmenityDto>>;

    public class UpdateAmenityCommandHandler : IRequestHandler<UpdateAmenityCommand, ErrorOr<AmenityDto>>
    {
        private readonly IRepository<Amenity> _amenityRepository;

        public UpdateAmenityCommandHandler(IRepository<Amenity> amenityRepository)
        {
            _amenityRepository = amenityRepository;
        }

        public async Task<ErrorOr<AmenityDto>> Handle(UpdateAmenityCommand request, CancellationToken cancellationToken)
        {
            var amenity = await _amenityRepository.GetAsync(request.Id, cancellationToken);

            if (amenity == null || amenity.IsDeleted)
            {
                return Error.NotFound("Amenity.NotFound", $"Amenity with ID {request.Id} was not found.");
            }

            var existingAmenityWithName = await _amenityRepository.Query()
                .Where(x => x.Name == request.Name && x.Id != request.Id && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingAmenityWithName != null)
            {
                return Error.Conflict("Amenity.DuplicateName",
                    $"An amenity with the name '{request.Name}' already exists.");
            }

            amenity.Name = request.Name;
            amenity.Description = request.Description;
            amenity.UpdatedAt = DateTime.UtcNow;

            await _amenityRepository.UpdateAsync(amenity, cancellationToken);

            return new AmenityDto(amenity.Id, amenity.Name, amenity.Description, amenity.CreatedAt, amenity.UpdatedAt);
        }
    }

    public class UpdateAmenityCommandValidator : AbstractValidator<UpdateAmenityCommand>
    {
        public UpdateAmenityCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty();
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Description));
        }
    }
}
