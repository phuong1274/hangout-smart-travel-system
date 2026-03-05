using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Queries
{
    public record GetLocationQuery(int Id) : IRequest<ErrorOr<LocationDto>>;

    public class GetLocationQueryHandler : IRequestHandler<GetLocationQuery, ErrorOr<LocationDto>>
    {
        private readonly IRepository<Location> _repository;

        public GetLocationQueryHandler(IRepository<Location> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationDto>> Handle(GetLocationQuery request, CancellationToken ct)
        {
            var location = await _repository.Query()
                .Include(l => l.LocationType)
                .Include(l => l.Destination)
                .Include(l => l.LocationTags).ThenInclude(lt => lt.Tag)
                .Include(l => l.LocationMedias)
                .FirstOrDefaultAsync(l => l.Id == request.Id, ct);

            if (location is null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.Id} not found.");
            }

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
                location.DestinationId,
                location.LocationType?.Name ?? string.Empty,
                location.Destination?.Name ?? string.Empty,
                location.LocationTags.Select(lt => lt.Tag.Id).ToList(),
                location.LocationMedias.Select(lm => lm.Link).ToList()
            );
        }
    }
}
