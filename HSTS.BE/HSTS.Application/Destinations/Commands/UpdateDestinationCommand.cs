using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Destinations.Commands
{
    public record UpdateDestinationCommand(
        int Id,
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? StateId,
        string? CountryId
    ) : IRequest<ErrorOr<DestinationDto>>;

    public class UpdateDestinationCommandHandler : IRequestHandler<UpdateDestinationCommand, ErrorOr<DestinationDto>>
    {
        private readonly IRepository<Destination> _repository;

        public UpdateDestinationCommandHandler(IRepository<Destination> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<DestinationDto>> Handle(UpdateDestinationCommand request, CancellationToken cancellationToken)
        {
            var destination = await _repository.GetAsync(request.Id, cancellationToken);

            if (destination is null || destination.IsDeleted)
            {
                return Error.NotFound("Destination.NotFound", $"Destination with ID {request.Id} not found.");
            }

            var existingDestination = await _repository.Query()
                .Where(x => x.Name == request.Name && x.Id != request.Id && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingDestination != null)
            {
                return Error.Conflict("Destination.DuplicateName",
                    $"A destination with the name '{request.Name}' already exists.");
            }

            destination.Name = request.Name;
            destination.EnglishName = request.EnglishName;
            destination.Code = request.Code;
            destination.Latitude = request.Latitude;
            destination.Longitude = request.Longitude;
            destination.StateId = request.StateId;
            destination.CountryId = request.CountryId;

            await _repository.UpdateAsync(destination, cancellationToken);
            return destination.ToDto();
        }
    }

    public class UpdateDestinationCommandValidator : AbstractValidator<UpdateDestinationCommand>
    {
        public UpdateDestinationCommandValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("Destination ID cannot be empty.");

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
