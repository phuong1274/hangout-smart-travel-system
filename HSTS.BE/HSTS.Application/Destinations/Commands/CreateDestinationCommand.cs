using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Destinations.Commands
{
    public record CreateDestinationCommand(
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? Type,
        int? StateId,
        string? CountryId
    ) : IRequest<ErrorOr<DestinationDto>>;

    public class CreateDestinationCommandHandler : IRequestHandler<CreateDestinationCommand, ErrorOr<DestinationDto>>
    {
        private readonly IRepository<Destination> _repository;

        public CreateDestinationCommandHandler(IRepository<Destination> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<DestinationDto>> Handle(CreateDestinationCommand request, CancellationToken cancellationToken)
        {
            var existingDestination = await _repository.Query()
                .Where(x => x.Name == request.Name && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingDestination != null)
            {
                return Error.Conflict("Destination.DuplicateName",
                    $"A destination with the name '{request.Name}' already exists.");
            }

            var destination = new Destination
            {
                Name = request.Name,
                EnglishName = request.EnglishName,
                Code = request.Code,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Type = request.Type,
                StateId = request.StateId,
                CountryId = request.CountryId
            };

            await _repository.AddAsync(destination, cancellationToken);
            return destination.ToDto();
        }
    }

    public class CreateDestinationCommandValidator : AbstractValidator<CreateDestinationCommand>
    {
        public CreateDestinationCommandValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Destination name cannot be empty.")
                .MaximumLength(200).WithMessage("Destination name cannot exceed 200 characters.");

            RuleFor(x => x.EnglishName)
                .MaximumLength(200).WithMessage("English name cannot exceed 200 characters.");

            RuleFor(x => x.Code)
                .MaximumLength(50).WithMessage("Code cannot exceed 50 characters.");

            RuleFor(x => x.Latitude)
                .InclusiveBetween(-90, 90).When(x => x.Latitude.HasValue)
                .WithMessage("Latitude must be between -90 and 90.");

            RuleFor(x => x.Longitude)
                .InclusiveBetween(-180, 180).When(x => x.Longitude.HasValue)
                .WithMessage("Longitude must be between -180 and 180.");

            RuleFor(x => x.CountryId)
                .MaximumLength(50).WithMessage("Country ID cannot exceed 50 characters.");
        }
    }
}
