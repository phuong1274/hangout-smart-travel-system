using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Queries
{
    public record LocationPagedResponse(IEnumerable<LocationDto> Items, int TotalCount);

    public record GetLocationsPagingQuery(string? SearchTerm, int PageIndex, int PageSize)
        : IRequest<ErrorOr<LocationPagedResponse>>;

    public class GetLocationsPagingQueryHandler : IRequestHandler<GetLocationsPagingQuery, ErrorOr<LocationPagedResponse>>
    {
        private readonly IRepository<Location> _repository;

        public GetLocationsPagingQueryHandler(IRepository<Location> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationPagedResponse>> Handle(GetLocationsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(l => l.LocationType)
                .Include(l => l.Destination)
                .Include(l => l.LocationTags).ThenInclude(lt => lt.Tag)
                .Include(l => l.LocationMedias)
                .Include(l => l.LocationAmenities).ThenInclude(la => la.Amenity)
                .AsQueryable();

            query = query.Where(l => !l.IsDeleted);

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(l => l.Name.Contains(request.SearchTerm) || l.Description.Contains(request.SearchTerm));
            }

            query = query.OrderByDescending(l => l.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            var locationDtos = items.Select(l => new LocationDto(
                l.Id,
                l.Name,
                l.Description,
                l.Latitude,
                l.Longitude,
                l.TicketPrice,
                l.MinimumAge,
                l.Address,
                l.SocialLink,
                l.LocationTypeId,
                l.DestinationId,
                l.LocationType?.Name ?? string.Empty,
                l.Destination?.Name ?? string.Empty,
                l.LocationTags.Select(lt => lt.Tag.Id).ToList(),
                l.LocationMedias.Select(lm => lm.Link).ToList(),
                l.Telephone,
                l.Email,
                l.Rating,
                l.ReviewCount,
                l.PriceRange,
                l.PriceMinUsd,
                l.PriceMaxUsd,
                l.Source,
                l.SourceUrl,
                l.RecommendedDurationMinutes,
                l.LocationAmenities.Select(la => la.Amenity.Id).ToList()
            )).ToList();

            return new LocationPagedResponse(locationDtos, total);
        }
    }
}
