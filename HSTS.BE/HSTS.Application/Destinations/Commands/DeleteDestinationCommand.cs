using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Destinations.Commands
{
    public record DeleteDestinationCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteDestinationCommandHandler : IRequestHandler<DeleteDestinationCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<Destination> _repository;
        private readonly IRepository<Location> _locationRepository;

        public DeleteDestinationCommandHandler(IRepository<Destination> repository, IRepository<Location> locationRepository)
        {
            _repository = repository;
            _locationRepository = locationRepository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteDestinationCommand request, CancellationToken cancellationToken)
        {
            var destination = await _repository.GetAsync(request.Id, cancellationToken);

            if (destination is null || destination.IsDeleted)
            {
                return Error.NotFound("Destination.NotFound", $"Destination with ID {request.Id} not found.");
            }

            // Check if any non-deleted locations are using this destination
            var locationsUsingDestination = await _locationRepository.Query()
                .Where(l => l.DestinationId == request.Id && !l.IsDeleted)
                .AnyAsync(cancellationToken);

            if (locationsUsingDestination)
            {
                return Error.Validation(
                    "Destination.CannotDelete",
                    "Cannot delete destination because it is being used by one or more active locations.");
            }

            // Soft delete
            destination.IsDeleted = true;
            await _repository.UpdateAsync(destination, cancellationToken);

            return Result.Deleted;
        }
    }

    public class DeleteDestinationCommandValidator : AbstractValidator<DeleteDestinationCommand>
    {
        public DeleteDestinationCommandValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("Destination ID cannot be empty.");
        }
    }
}
