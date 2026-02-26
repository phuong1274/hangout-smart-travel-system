using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Commands
{
    public record UpdateLocationTypeCommand(int Id, string Name) : IRequest<ErrorOr<LocationTypeDto>>;

    public class UpdateLocationTypeCommandHandler : IRequestHandler<UpdateLocationTypeCommand, ErrorOr<LocationTypeDto>>
    {
        private readonly IRepository<LocationType> _repository;

        public UpdateLocationTypeCommandHandler(IRepository<LocationType> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<LocationTypeDto>> Handle(UpdateLocationTypeCommand request, CancellationToken cancellationToken)
        {
            var locationType = await _repository.GetAsync(request.Id, cancellationToken);

            if (locationType == null || locationType.IsDeleted)
            {
                return Error.NotFound("LocationType.NotFound", "Location type not found.");
            }

            var duplicateName = await _repository.Query()
                .Where(x => x.Name == request.Name && x.Id != request.Id && !x.IsDeleted)
                .AnyAsync(cancellationToken);

            if (duplicateName)
            {
                return Error.Conflict("LocationType.DuplicateName",
                    $"A location type with the name '{request.Name}' already exists.");
            }

            locationType.Name = request.Name;
            locationType.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(locationType, cancellationToken);

            return locationType.ToDto();
        }
    }

    public class UpdateLocationTypeCommandValidator : AbstractValidator<UpdateLocationTypeCommand>
    {
        public UpdateLocationTypeCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty();
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Location type name cannot be empty.")
                .MaximumLength(100).WithMessage("Location type name cannot exceed 100 characters.");
        }
    }
}
