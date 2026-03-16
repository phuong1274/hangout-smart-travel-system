using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Queries
{
    public record LocationPagedResponse(IEnumerable<LocationDto> Items, int TotalCount);

    /// <summary>
    /// Admin query - returns ALL locations including deleted ones
    /// </summary>
    public record GetAllLocationsPagingQuery(string? SearchTerm, bool IncludeDeleted = false, int PageIndex = 1, int PageSize = 10)
        : IRequest<ErrorOr<LocationPagedResponse>>;

    public class GetAllLocationsPagingQueryHandler : IRequestHandler<GetAllLocationsPagingQuery, ErrorOr<LocationPagedResponse>>
    {
        private readonly IRepository<Location> _repository;

        public GetAllLocationsPagingQueryHandler(IRepository<Location> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationPagedResponse>> Handle(GetAllLocationsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(l => l.LocationType)
                .Include(l => l.Destination)
                .Include(l => l.LocationTags).ThenInclude(lt => lt.Tag)
                .Include(l => l.LocationMedias)
                .Include(l => l.LocationAmenities).ThenInclude(la => la.Amenity)
                .Include(l => l.SocialLinks)
                .AsQueryable();

            // Only filter by IsDeleted if IncludeDeleted is false
            if (!request.IncludeDeleted)
            {
                query = query.Where(l => !l.IsDeleted);
            }

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(l => l.Name.Contains(request.SearchTerm) ||
                    (l.Description != null && l.Description.Contains(request.SearchTerm)));
            }

            query = query.OrderByDescending(l => l.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            var locationDtos = items.Select(l => l.ToDto()).ToList();

            return new LocationPagedResponse(locationDtos, total);
        }
    }
}
