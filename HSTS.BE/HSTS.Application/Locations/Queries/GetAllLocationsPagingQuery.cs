using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Queries
{
    /// <summary>
    /// Admin query - returns ALL locations including deleted ones
    /// </summary>
    public record GetAllLocationsPagingQuery(
        string? SearchTerm,
        List<int>? TagIds,
        List<int>? LocationTypeIds,
        List<int>? DistrictIds,
        DateTime? FromDate,
        DateTime? ToDate,
        bool IncludeDeleted = false,
        int PageIndex = 1,
        int PageSize = 10,
        DateTime? ReferenceDate = null) : IRequest<ErrorOr<LocationPagedResponse>>;

    public class GetAllLocationsPagingQueryHandler : IRequestHandler<GetAllLocationsPagingQuery, ErrorOr<LocationPagedResponse>>
    {
        private readonly IRepository<Location> _repository;

        public GetAllLocationsPagingQueryHandler(IRepository<Location> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationPagedResponse>> Handle(GetAllLocationsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(l => l.LocationType)
                .Include(l => l.District)
                .Include(l => l.LocationTags).ThenInclude(lt => lt.Tag)
                .Include(l => l.LocationMedias)
                .Include(l => l.LocationAmenities).ThenInclude(la => la.Amenity)
                .Include(l => l.SocialLinks)
                .Include(l => l.Closures)  // Include closures for effective status calculation
                .AsQueryable();

            // Only filter by IsDeleted if IncludeDeleted is false
            if (!request.IncludeDeleted)
            {
                query = query.Where(l => !l.IsDeleted);
            }

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

            // Filter by District IDs (multiple select - ANY of the selected districts)
            if (request.DistrictIds != null && request.DistrictIds.Count > 0)
            {
                query = query.Where(l => request.DistrictIds.Contains(l.DistrictId));
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

            // Map to DTO with effective status based on reference date
            var locationDtos = items.Select(l => l.ToDto(request.ReferenceDate)).ToList();

            return new LocationPagedResponse(locationDtos, total);
        }
    }
}
