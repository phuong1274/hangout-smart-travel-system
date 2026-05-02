using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Districts.Queries
{
    public record DistrictPagedResponse(IEnumerable<DistrictDto> Items, int TotalCount);

    public record GetDistrictsPagingQuery(string? SearchTerm, int? ProvinceId, DateTime? FromDate, DateTime? ToDate, int PageIndex, int PageSize)
        : IRequest<ErrorOr<DistrictPagedResponse>>;

    public class GetDistrictsPagingQueryHandler : IRequestHandler<GetDistrictsPagingQuery, ErrorOr<DistrictPagedResponse>>
    {
        private readonly IRepository<District> _repository;

        public GetDistrictsPagingQueryHandler(IRepository<District> repository)
            => _repository = repository;

        public async Task<ErrorOr<DistrictPagedResponse>> Handle(GetDistrictsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Where(d => !d.IsDeleted);

            if (request.ProvinceId.HasValue)
            {
                query = query.Where(d => d.ProvinceId == request.ProvinceId.Value);
            }

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.ToLower();
                query = query.Where(d =>
                    d.Name.ToLower().Contains(searchTerm) ||
                    (d.EnglishName != null && d.EnglishName.ToLower().Contains(searchTerm)) ||
                    (d.Province != null && d.Province.Name.ToLower().Contains(searchTerm)));
            }

            // Filter by date range (CreatedAt)
            if (request.FromDate.HasValue)
            {
                query = query.Where(d => d.CreatedAt >= request.FromDate.Value);
            }
            if (request.ToDate.HasValue)
            {
                query = query.Where(d => d.CreatedAt <= request.ToDate.Value);
            }

            query = query
                .OrderByDescending(d => d.CreatedAt)
                .Include(d => d.Province);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            var districtDtos = items.Select(d => d.ToDto()).ToList();

            return new DistrictPagedResponse(districtDtos, total);
        }
    }
}
