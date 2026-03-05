using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Commands
{
    public record UpdateLocationCommand(
        int Id,
        string Name,
        string Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        string? SocialLink,
        int LocationTypeId,
        int DestinationId,
        List<int>? TagIds,
        List<string>? MediaLinks) : IRequest<ErrorOr<LocationDto>>;

    public class UpdateLocationCommandHandler : IRequestHandler<UpdateLocationCommand, ErrorOr<LocationDto>>
    {
        private readonly IRepository<Location> _repository;

        public UpdateLocationCommandHandler(IRepository<Location> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<LocationDto>> Handle(UpdateLocationCommand request, CancellationToken cancellationToken)
        {
            var location = await _repository.GetAsync(request.Id, cancellationToken);

            if (location == null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.Id} was not found.");
            }

            var existingLocationWithName = await _repository.Query()
                .Where(x => x.Name == request.Name && x.Id != request.Id && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingLocationWithName != null)
            {
                return Error.Conflict("Location.DuplicateName",
                    $"A location with the name '{request.Name}' already exists.");
            }

            location.Name = request.Name;
            location.Description = request.Description;
            location.Latitude = request.Latitude;
            location.Longitude = request.Longitude;
            location.TicketPrice = request.TicketPrice;
            location.MinimumAge = request.MinimumAge;
            location.Address = request.Address;
            location.SocialLink = request.SocialLink;
            location.LocationTypeId = request.LocationTypeId;
            location.DestinationId = request.DestinationId;
            location.UpdatedAt = DateTime.UtcNow;

            // Update tags if provided
            if (request.TagIds != null)
            {
                // Remove existing tags
                location.LocationTags.Clear();

                // Add new tags
                if (request.TagIds.Count > 0)
                {
                    var tags = await _repository.Query()
                        .Where(t => request.TagIds.Contains(t.Id) && !t.IsDeleted)
                        .ToListAsync(cancellationToken);

                    foreach (var tag in tags)
                    {
                        location.LocationTags.Add(new LocationTag
                        {
                            LocationId = location.Id,
                            TagId = tag.Id,
                            Score = 1.0
                        });
                    }
                }
            }

            // Update media links if provided
            if (request.MediaLinks != null)
            {
                // Remove existing media
                location.LocationMedias.Clear();

                // Add new media links
                if (request.MediaLinks.Count > 0)
                {
                    foreach (var link in request.MediaLinks)
                    {
                        location.LocationMedias.Add(new LocationMedia
                        {
                            LocationId = location.Id,
                            Link = link
                        });
                    }
                }
            }

            await _repository.UpdateAsync(location, cancellationToken);

            return new LocationDto(
                location.Id,
                location.Name,
                location.Description,
                location.Latitude,
                location.Longitude,
                location.TicketPrice,
                location.MinimumAge,
                location.Address,
                location.SocialLink,
                location.LocationTypeId,
                location.DestinationId);
        }
    }

    public class UpdateLocationCommandValidator : AbstractValidator<UpdateLocationCommand>
    {
        public UpdateLocationCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty();
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).MaximumLength(2000);
            RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
            RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
            RuleFor(x => x.TicketPrice).GreaterThanOrEqualTo(0);
            RuleFor(x => x.MinimumAge).InclusiveBetween(0, 120);
            RuleFor(x => x.Address).NotEmpty().MaximumLength(300);
            RuleFor(x => x.SocialLink).MaximumLength(500);
            RuleFor(x => x.LocationTypeId).NotEmpty();
            RuleFor(x => x.DestinationId).NotEmpty();
        }
    }
}
