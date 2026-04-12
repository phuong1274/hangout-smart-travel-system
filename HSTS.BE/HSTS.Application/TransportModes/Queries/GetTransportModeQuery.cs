using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransportModes.Queries
{
    public record GetTransportModeQuery(int Id) : IRequest<ErrorOr<TransportModeDto>>;

    public class GetTransportModeQueryHandler
        : IRequestHandler<GetTransportModeQuery, ErrorOr<TransportModeDto>>
    {
        private readonly IRepository<TransportMode> _repository;

        public GetTransportModeQueryHandler(IRepository<TransportMode> repository)
            => _repository = repository;

        public async Task<ErrorOr<TransportModeDto>> Handle(
            GetTransportModeQuery request, CancellationToken ct)
        {
            var entity = await _repository.Query()
                .Include(x => x.LocalTransportMetrics)
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, ct);

            if (entity is null)
                return Error.NotFound("TransportMode.NotFound",
                    $"Transport mode with ID {request.Id} not found.");

            return entity.ToDto();
        }
    }
}
