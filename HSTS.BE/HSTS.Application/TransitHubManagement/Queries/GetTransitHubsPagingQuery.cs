using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransitHubManagement.Queries
{
    public record TransitHubPagedResponse(IEnumerable<TransitHubDto> Items, int TotalCount);

    public record GetTransitHubsPagingQuery(
        string? SearchTerm,
        int? DistrictId,
        int? TransportationId,
        int? TransitHubTypeId,
        int PageIndex,
        int PageSize) : IRequest<ErrorOr<TransitHubPagedResponse>>;

    public class GetTransitHubsPagingQueryHandler
        : IRequestHandler<GetTransitHubsPagingQuery, ErrorOr<TransitHubPagedResponse>>
    {
        private readonly IRepository<Domain.Entities.TransitHubs> _repository;

        public GetTransitHubsPagingQueryHandler(IRepository<Domain.Entities.TransitHubs> repository)
            => _repository = repository;

        public async Task<ErrorOr<TransitHubPagedResponse>> Handle(
            GetTransitHubsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(x => x.District)
                .Include(x => x.TransportMode)
                .Include(x => x.TransitHubType)
                .Where(x => !x.IsDeleted);

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(x =>
                    x.Name.Contains(request.SearchTerm) ||
                    x.Code.Contains(request.SearchTerm));
            }

            if (request.DistrictId.HasValue)
                query = query.Where(x => x.DistrictId == request.DistrictId.Value);

            if (request.TransportationId.HasValue)
                query = query.Where(x => x.TransportationId == request.TransportationId.Value);

            if (request.TransitHubTypeId.HasValue)
                query = query.Where(x => x.TransitHubTypeId == request.TransitHubTypeId.Value);

            query = query.OrderByDescending(x => x.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex, request.PageSize, query, ct);

            var dtos = items.Select(x => x.ToDto()).ToList();
            return new TransitHubPagedResponse(dtos, total);
        }
    }
}
