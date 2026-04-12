using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocalTransportMetricsFeature.Commands
{
    public record UpdateLocalTransportMetricsCommand(
        int TransportationId,
        decimal CostPerKm,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance) : IRequest<ErrorOr<LocalTransportMetricsDto>>;

    public class UpdateLocalTransportMetricsCommandHandler
        : IRequestHandler<UpdateLocalTransportMetricsCommand, ErrorOr<LocalTransportMetricsDto>>
    {
        private readonly IRepository<LocalTransportMetrics> _repository;

        public UpdateLocalTransportMetricsCommandHandler(IRepository<LocalTransportMetrics> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocalTransportMetricsDto>> Handle(
            UpdateLocalTransportMetricsCommand request, CancellationToken ct)
        {
            var entity = await _repository.Query()
                .Include(x => x.TransportMode)
                .FirstOrDefaultAsync(
                    x => x.TransportationId == request.TransportationId && !x.IsDeleted, ct);

            if (entity is null)
                return Error.NotFound("LocalTransportMetrics.NotFound",
                    $"Local transport metrics with TransportationId {request.TransportationId} not found.");

            entity.CostPerKm = request.CostPerKm;
            entity.SpeedKmh = request.SpeedKmh;
            entity.MaxRecommendedDistance = request.MaxRecommendedDistance;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(entity, ct);
            return entity.ToDto();
        }
    }

    public class UpdateLocalTransportMetricsCommandValidator
        : AbstractValidator<UpdateLocalTransportMetricsCommand>
    {
        public UpdateLocalTransportMetricsCommandValidator()
        {
            RuleFor(x => x.TransportationId).GreaterThan(0);
            RuleFor(x => x.CostPerKm).GreaterThanOrEqualTo(0);
            RuleFor(x => x.SpeedKmh).GreaterThan(0);
            RuleFor(x => x.MaxRecommendedDistance).GreaterThan(0)
                .When(x => x.MaxRecommendedDistance.HasValue);
        }
    }
}
