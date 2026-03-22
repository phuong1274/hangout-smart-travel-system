using HSTS.Application.Interfaces;
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
                .Include(l => l.LocationAmenities).ThenInclude(la => la.Amenity)
                .Include(l => l.SocialLinks)
                .Include(l => l.OpeningHours)
                .Include(l => l.Seasons)
                .FirstOrDefaultAsync(l => l.Id == request.Id && !l.IsDeleted, ct);

            if (location is null)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.Id} not found.");
            }

            return location.ToDto();
        }
    }
}
