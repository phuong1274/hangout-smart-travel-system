using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Queries
{
    public record LocationPagedResponse(IEnumerable<LocationDto> Items, int TotalCount);

    public record GetLocationsPagingQuery(
        string? SearchTerm,
        List<int>? TagIds,
        List<LocationType>? LocationTypeIds,
        List<int>? DestinationIds,
        DateTime? FromDate,
        DateTime? ToDate,
        int PageIndex,
        int PageSize) : IRequest<ErrorOr<LocationPagedResponse>>;

    public class GetLocationsPagingQueryHandler : IRequestHandler<GetLocationsPagingQuery, ErrorOr<LocationPagedResponse>>
    {
        private readonly IRepository<Location> _repository;

        public GetLocationsPagingQueryHandler(IRepository<Location> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationPagedResponse>> Handle(GetLocationsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(l => l.Destination)
                .Include(l => l.LocationTags).ThenInclude(lt => lt.Tag)
                .Include(l => l.LocationMedias)
                .Include(l => l.LocationAmenities).ThenInclude(la => la.Amenity)
                .Include(l => l.SocialLinks)
                .AsQueryable();

            query = query.Where(l => !l.IsDeleted);

            // Filter by search term (Name, Description)
            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(l => l.Name.Contains(request.SearchTerm) ||
                    (l.Description != null && l.Description.Contains(request.SearchTerm)));
            }

            // Filter by Tag IDs (multiple select - locations must have ANY of the selected tags)
            if (request.TagIds != null && request.TagIds.Count > 0)
            {
                query = query.Where(l => l.LocationTags.Any(lt => request.TagIds.Contains(lt.TagId)));
            }

            // Filter by Location Type IDs (multiple select - ANY of the selected types)
            if (request.LocationTypeIds != null && request.LocationTypeIds.Count > 0)
            {
                query = query.Where(l => l.LocationTypeId.HasValue && request.LocationTypeIds.Contains(l.LocationTypeId.Value));
            }

            // Filter by Destination IDs (multiple select - ANY of the selected destinations)
            if (request.DestinationIds != null && request.DestinationIds.Count > 0)
            {
                query = query.Where(l => request.DestinationIds.Contains(l.DestinationId));
            }

            // Filter by date range (CreatedAt)
            if (request.FromDate.HasValue)
            {
                query = query.Where(l => l.CreatedAt >= request.FromDate.Value);
            }
            if (request.ToDate.HasValue)
            {
                query = query.Where(l => l.CreatedAt <= request.ToDate.Value);
            }

            query = query.OrderByDescending(l => l.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query ?? _repository.Query(),
                ct);

            var locationDtos = items.Select(l => l.ToDto()).ToList();

            return new LocationPagedResponse(locationDtos, total);
        }
    }
}
