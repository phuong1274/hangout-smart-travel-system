using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocalTransportMetricsFeature.Queries
{
    public record LocalTransportMetricsPagedResponse(
        IEnumerable<LocalTransportMetricsDto> Items, int TotalCount);

    public record GetLocalTransportMetricsPagingQuery(
        int? TransportationId,
        int PageIndex,
        int PageSize) : IRequest<ErrorOr<LocalTransportMetricsPagedResponse>>;

    public class GetLocalTransportMetricsPagingQueryHandler
        : IRequestHandler<GetLocalTransportMetricsPagingQuery, ErrorOr<LocalTransportMetricsPagedResponse>>
    {
        private readonly IRepository<LocalTransportMetrics> _repository;

        public GetLocalTransportMetricsPagingQueryHandler(IRepository<LocalTransportMetrics> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocalTransportMetricsPagedResponse>> Handle(
            GetLocalTransportMetricsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(x => x.TransportMode)
                .Where(x => !x.IsDeleted);

            if (request.TransportationId.HasValue)
                query = query.Where(x => x.TransportationId == request.TransportationId.Value);

            query = query.OrderByDescending(x => x.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex, request.PageSize, query, ct);

            var dtos = items.Select(x => x.ToDto()).ToList();
            return new LocalTransportMetricsPagedResponse(dtos, total);
        }
    }
}
