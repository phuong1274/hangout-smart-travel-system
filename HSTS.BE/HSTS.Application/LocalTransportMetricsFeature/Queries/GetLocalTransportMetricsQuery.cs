using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocalTransportMetricsFeature.Queries
{
    public record GetLocalTransportMetricsQuery(int TransportationId)
        : IRequest<ErrorOr<LocalTransportMetricsDto>>;

    public class GetLocalTransportMetricsQueryHandler
        : IRequestHandler<GetLocalTransportMetricsQuery, ErrorOr<LocalTransportMetricsDto>>
    {
        private readonly IRepository<LocalTransportMetrics> _repository;

        public GetLocalTransportMetricsQueryHandler(IRepository<LocalTransportMetrics> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocalTransportMetricsDto>> Handle(
            GetLocalTransportMetricsQuery request, CancellationToken ct)
        {
            var entity = await _repository.Query()
                .Include(x => x.TransportMode)
                .FirstOrDefaultAsync(
                    x => x.TransportationId == request.TransportationId && !x.IsDeleted, ct);

            if (entity is null)
                return Error.NotFound("LocalTransportMetrics.NotFound",
                    $"Local transport metrics with TransportationId {request.TransportationId} not found.");

            return entity.ToDto();
        }
    }
}
