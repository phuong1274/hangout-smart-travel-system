using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocalTransportMetricsFeature.Commands
{
    public record DeleteLocalTransportMetricsCommand(int TransportationId)
        : IRequest<ErrorOr<Deleted>>;

    public class DeleteLocalTransportMetricsCommandHandler
        : IRequestHandler<DeleteLocalTransportMetricsCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<LocalTransportMetrics> _repository;

        public DeleteLocalTransportMetricsCommandHandler(IRepository<LocalTransportMetrics> repository)
            => _repository = repository;

        public async Task<ErrorOr<Deleted>> Handle(
            DeleteLocalTransportMetricsCommand request, CancellationToken ct)
        {
            var entity = await _repository.Query()
                .FirstOrDefaultAsync(
                    x => x.TransportationId == request.TransportationId && !x.IsDeleted, ct);

            if (entity is null)
                return Error.NotFound("LocalTransportMetrics.NotFound",
                    $"Local transport metrics with TransportationId {request.TransportationId} not found.");

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(entity, ct);
            return Result.Deleted;
        }
    }
}
