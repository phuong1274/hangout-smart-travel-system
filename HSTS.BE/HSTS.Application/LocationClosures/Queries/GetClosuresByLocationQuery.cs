using ErrorOr;
using MediatR;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.LocationClosures;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationClosures.Queries
{
    public record GetClosuresByLocationQuery(int LocationId) : IRequest<ErrorOr<List<LocationClosureDto>>>;

    public class GetClosuresByLocationQueryHandler : IRequestHandler<GetClosuresByLocationQuery, ErrorOr<List<LocationClosureDto>>>
    {
        private readonly IRepository<LocationClosure> _closureRepository;

        public GetClosuresByLocationQueryHandler(IRepository<LocationClosure> closureRepository)
        {
            _closureRepository = closureRepository;
        }

        public async Task<ErrorOr<List<LocationClosureDto>>> Handle(GetClosuresByLocationQuery request, CancellationToken cancellationToken)
        {
            var closures = await _closureRepository.Query()
                .Where(c => c.LocationId == request.LocationId && !c.IsDeleted)
                .OrderByDescending(c => c.StartDate)
                .ToListAsync(cancellationToken);

            return closures.Select(c => c.ToDto()).ToList();
        }
    }
}
