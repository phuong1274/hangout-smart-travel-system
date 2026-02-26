using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Commands
{
    public record CreateLocationTypeCommand(string Name) : IRequest<ErrorOr<LocationTypeDto>>;

    public class CreateLocationTypeCommandHandler : IRequestHandler<CreateLocationTypeCommand, ErrorOr<LocationTypeDto>>
    {
        private readonly IRepository<LocationType> _repository;

        public CreateLocationTypeCommandHandler(IRepository<LocationType> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<LocationTypeDto>> Handle(CreateLocationTypeCommand request, CancellationToken cancellationToken)
        {
            var existingLocationType = await _repository.Query()
                .Where(x => x.Name == request.Name && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingLocationType != null)
            {
                return Error.Conflict("LocationType.DuplicateName",
                    $"A location type with the name '{request.Name}' already exists.");
            }

            var locationType = new LocationType { Name = request.Name };
            await _repository.AddAsync(locationType, cancellationToken);
            
            return locationType.ToDto();
        }
    }

    public class CreateLocationTypeCommandValidator : AbstractValidator<CreateLocationTypeCommand>
    {
        public CreateLocationTypeCommandValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Location type name cannot be empty.")
                .MaximumLength(100).WithMessage("Location type name cannot exceed 100 characters.");
        }
    }
}
