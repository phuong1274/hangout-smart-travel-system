using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Queries
{
    public record GetLocationQuery(int Id, DateTime? ReferenceDate = null) : IRequest<ErrorOr<LocationDto>>;

    public class GetLocationQueryHandler : IRequestHandler<GetLocationQuery, ErrorOr<LocationDto>>
    {
        private readonly IRepository<Location> _repository;

        public GetLocationQueryHandler(IRepository<Location> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationDto>> Handle(GetLocationQuery request, CancellationToken ct)
        {
            var location = await _repository.Query()
                .Include(l => l.LocationType)
                .Include(l => l.District)
                .Include(l => l.LocationTags).ThenInclude(lt => lt.Tag)
                .Include(l => l.LocationMedias)
                .Include(l => l.LocationAmenities).ThenInclude(la => la.Amenity)
                .Include(l => l.SocialLinks)
                .Include(l => l.OpeningHours)
                .Include(l => l.Seasons)
                .Include(l => l.Closures)  // Include closures for effective status calculation
                .FirstOrDefaultAsync(l => l.Id == request.Id && !l.IsDeleted, ct);

            if (location is null)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.Id} not found.");
            }

            return location.ToDto(request.ReferenceDate);
        }
    }

    /// <summary>
    /// Extension method to query location with effective status for a specific date
    /// </summary>
    public static class LocationQueryExtensions
    {
        public static async Task<LocationDto?> GetLocationWithEffectiveStatusAsync(
            this IRepository<Location> repository,
            int locationId,
            DateTime referenceDate,
            CancellationToken cancellationToken = default)
        {
            var location = await repository.Query()
                .Include(l => l.District)
                .Include(l => l.LocationTags).ThenInclude(lt => lt.Tag)
                .Include(l => l.LocationMedias)
                .Include(l => l.LocationAmenities).ThenInclude(la => la.Amenity)
                .Include(l => l.SocialLinks)
                .Include(l => l.OpeningHours)
                .Include(l => l.Seasons)
                .Include(l => l.Closures)
                .FirstOrDefaultAsync(l => l.Id == locationId && !l.IsDeleted, cancellationToken);

            return location?.ToDto(referenceDate);
        }
    }
}
