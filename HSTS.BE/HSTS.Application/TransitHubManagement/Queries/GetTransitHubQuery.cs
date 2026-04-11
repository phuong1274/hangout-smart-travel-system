using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransitHubManagement.Queries
{
    public record GetTransitHubQuery(int Id) : IRequest<ErrorOr<TransitHubDto>>;

    public class GetTransitHubQueryHandler
        : IRequestHandler<GetTransitHubQuery, ErrorOr<TransitHubDto>>
    {
        private readonly IRepository<Domain.Entities.TransitHubs> _repository;

        public GetTransitHubQueryHandler(IRepository<Domain.Entities.TransitHubs> repository)
            => _repository = repository;

        public async Task<ErrorOr<TransitHubDto>> Handle(
            GetTransitHubQuery request, CancellationToken ct)
        {
            var entity = await _repository.Query()
                .Include(x => x.District)
                .Include(x => x.TransportMode)
                .Include(x => x.TransitHubType)
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, ct);

            if (entity is null)
                return Error.NotFound("TransitHub.NotFound",
                    $"Transit hub with ID {request.Id} not found.");

            return entity.ToDto();
        }
    }
}
