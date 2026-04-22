using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocalTransportMetricsFeature.Commands
{
    public record CreateLocalTransportMetricsCommand(
        int TransportationId,
        decimal BaseFare,
        decimal BaseDistance,
        decimal PricePerKm,
        decimal? LongDistanceThreshold,
        decimal? LongDistancePricePerKm,
        decimal CongestionFeePerMinute,
        decimal SpeedKmh,
        decimal? MaxRecommendedDistance) : IRequest<ErrorOr<LocalTransportMetricsDto>>;

    public class CreateLocalTransportMetricsCommandHandler
        : IRequestHandler<CreateLocalTransportMetricsCommand, ErrorOr<LocalTransportMetricsDto>>
    {
        private readonly IRepository<LocalTransportMetrics> _repository;
        private readonly IAppDbContext _context;

        public CreateLocalTransportMetricsCommandHandler(
            IRepository<LocalTransportMetrics> repository,
            IAppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task<ErrorOr<LocalTransportMetricsDto>> Handle(
            CreateLocalTransportMetricsCommand request, CancellationToken ct)
        {
            // Validate FK reference
            if (!await _context.TransportModes.AnyAsync(t => t.Id == request.TransportationId && !t.IsDeleted, ct))
                return Error.NotFound("TransportMode.NotFound",
                    $"Transport mode with ID {request.TransportationId} not found.");

            var exists = await _repository.Query()
                .AnyAsync(x => x.TransportationId == request.TransportationId && !x.IsDeleted, ct);

            if (exists)
                return Error.Conflict("LocalTransportMetrics.Duplicate",
                    $"Metrics for TransportationId {request.TransportationId} already exist.");

            var entity = new LocalTransportMetrics
            {
                TransportationId = request.TransportationId,
                BaseFare = request.BaseFare,
                BaseDistance = request.BaseDistance,
                PricePerKm = request.PricePerKm,
                LongDistanceThreshold = request.LongDistanceThreshold,
                LongDistancePricePerKm = request.LongDistancePricePerKm,
                CongestionFeePerMinute = request.CongestionFeePerMinute,
                SpeedKmh = request.SpeedKmh,
                MaxRecommendedDistance = request.MaxRecommendedDistance
            };

            await _repository.AddAsync(entity, ct);

            // Reload with navigation properties for response
            var created = await _repository.Query()
                .AsNoTracking()
                .Include(x => x.TransportMode)
                .FirstAsync(x => x.TransportationId == entity.TransportationId, ct);

            return created.ToDto();
        }
    }

    public class CreateLocalTransportMetricsCommandValidator
        : AbstractValidator<CreateLocalTransportMetricsCommand>
    {
        public CreateLocalTransportMetricsCommandValidator()
        {
            RuleFor(x => x.TransportationId).GreaterThan(0);
            RuleFor(x => x.BaseFare).GreaterThanOrEqualTo(0);
            RuleFor(x => x.BaseDistance).GreaterThanOrEqualTo(0);
            RuleFor(x => x.PricePerKm).GreaterThanOrEqualTo(0);
            RuleFor(x => x.CongestionFeePerMinute).GreaterThanOrEqualTo(0);
            RuleFor(x => x.SpeedKmh).GreaterThan(0);
            RuleFor(x => x.MaxRecommendedDistance).GreaterThan(0)
                .When(x => x.MaxRecommendedDistance.HasValue);
        }
    }
}
