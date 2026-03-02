using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Commands
{
    public record CreateLocationCommand(
        string Name,
        string Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        string? SocialLink,
        int LocationTypeId) : IRequest<ErrorOr<LocationDto>>;

    public class CreateLocationCommandHandler : IRequestHandler<CreateLocationCommand, ErrorOr<LocationDto>>
    {
        private readonly IRepository<Location> _repository;

        public CreateLocationCommandHandler(IRepository<Location> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<LocationDto>> Handle(CreateLocationCommand request, CancellationToken cancellationToken)
        {
            var existingLocation = await _repository.Query()
                .Where(x => x.Name == request.Name && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingLocation != null)
            {
                return Error.Conflict("Location.DuplicateName",
                    $"A location with the name '{request.Name}' already exists.");
            }

            var location = new Location
            {
                Name = request.Name,
                Description = request.Description,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                TicketPrice = request.TicketPrice,
                MinimumAge = request.MinimumAge,
                Address = request.Address,
                SocialLink = request.SocialLink,
                LocationTypeId = request.LocationTypeId
            };

            await _repository.AddAsync(location, cancellationToken);
            return location.ToDto();
        }
    }

    public class CreateLocationCommandValidator : AbstractValidator<CreateLocationCommand>
    {
        public CreateLocationCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).MaximumLength(2000);
            RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
            RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
            RuleFor(x => x.TicketPrice).GreaterThanOrEqualTo(0);
            RuleFor(x => x.MinimumAge).InclusiveBetween(0, 120);
            RuleFor(x => x.Address).NotEmpty().MaximumLength(300);
            RuleFor(x => x.SocialLink).MaximumLength(500);
            RuleFor(x => x.LocationTypeId).NotEmpty();
        }
    }
}
