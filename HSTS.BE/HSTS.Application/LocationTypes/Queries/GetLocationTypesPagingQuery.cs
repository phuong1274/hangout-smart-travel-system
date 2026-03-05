using HSTS.Application.Interfaces;
using HSTS.Application.LocationTypes;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Queries
{
    public record LocationTypePagedResponse(IEnumerable<LocationTypeDto> Items, int TotalCount);

    public record GetLocationTypesPagingQuery(string? SearchTerm, int PageIndex, int PageSize)
        : IRequest<ErrorOr<LocationTypePagedResponse>>;

    public class GetLocationTypesPagingQueryHandler : IRequestHandler<GetLocationTypesPagingQuery, ErrorOr<LocationTypePagedResponse>>
    {
        private readonly IRepository<LocationType> _repository;

        public GetLocationTypesPagingQueryHandler(IRepository<LocationType> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationTypePagedResponse>> Handle(GetLocationTypesPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query();

            query = query.Where(lt => !lt.IsDeleted);

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(lt => lt.Name.Contains(request.SearchTerm));
            }

            query = query.OrderByDescending(lt => lt.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            var locationTypeDtos = items.Select(lt => lt.ToDto()).ToList();

            return new LocationTypePagedResponse(locationTypeDtos, total);
        }
    }
}
