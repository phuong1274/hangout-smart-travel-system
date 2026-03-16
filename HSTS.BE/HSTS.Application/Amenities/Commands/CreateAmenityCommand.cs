using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Amenities.Commands
{
    public record CreateAmenityCommand(
        string Name,
        string? Description) : IRequest<ErrorOr<AmenityDto>>;

    public class CreateAmenityCommandHandler : IRequestHandler<CreateAmenityCommand, ErrorOr<AmenityDto>>
    {
        private readonly IRepository<Amenity> _amenityRepository;

        public CreateAmenityCommandHandler(IRepository<Amenity> amenityRepository)
        {
            _amenityRepository = amenityRepository;
        }

        public async Task<ErrorOr<AmenityDto>> Handle(CreateAmenityCommand request, CancellationToken cancellationToken)
        {
            var existingAmenity = await _amenityRepository.Query()
                .Where(x => x.Name == request.Name && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingAmenity != null)
            {
                return Error.Conflict("Amenity.DuplicateName",
                    $"An amenity with the name '{request.Name}' already exists.");
            }

            var amenity = new Amenity
            {
                Name = request.Name,
                Description = request.Description
            };

            await _amenityRepository.AddAsync(amenity, cancellationToken);
            await _amenityRepository.UpdateAsync(amenity, cancellationToken);

            return new AmenityDto(amenity.Id, amenity.Name, amenity.Description, amenity.CreatedAt, amenity.UpdatedAt);
        }
    }

    public class CreateAmenityCommandValidator : AbstractValidator<CreateAmenityCommand>
    {
        public CreateAmenityCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Description));
        }
    }
}
