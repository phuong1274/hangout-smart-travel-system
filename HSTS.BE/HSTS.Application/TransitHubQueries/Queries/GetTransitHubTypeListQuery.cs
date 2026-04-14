using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransitHubQueries.Queries
{
    public record GetTransitHubTypeListQuery() : IRequest<ErrorOr<IEnumerable<TransitHubTypeDto>>>;

    public class GetTransitHubTypeListQueryHandler
        : IRequestHandler<GetTransitHubTypeListQuery, ErrorOr<IEnumerable<TransitHubTypeDto>>>
    {
        private readonly IRepository<TransitHubType> _repository;

        public GetTransitHubTypeListQueryHandler(IRepository<TransitHubType> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<IEnumerable<TransitHubTypeDto>>> Handle(
            GetTransitHubTypeListQuery request, CancellationToken cancellationToken)
        {
            var transitHubTypes = await _repository.Query()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.Name)
                .Select(x => x.ToDto())
                .ToListAsync(cancellationToken);

            return transitHubTypes;
        }
    }
}
