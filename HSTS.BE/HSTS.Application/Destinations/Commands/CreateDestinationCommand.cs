using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Destinations.Commands
{
    public record CreateDestinationCommand(string Name) : IRequest<ErrorOr<DestinationDto>>;

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

            var destination = new Destination { Name = request.Name };

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
        }
    }
}
