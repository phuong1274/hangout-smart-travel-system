using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Destinations.Queries
{
    public record GetAllDestinationsQuery() : IRequest<ErrorOr<IEnumerable<DestinationDto>>>;

    public class GetAllDestinationsQueryHandler : IRequestHandler<GetAllDestinationsQuery, ErrorOr<IEnumerable<DestinationDto>>>
    {
        private readonly IRepository<Destination> _repository;

        public GetAllDestinationsQueryHandler(IRepository<Destination> repository)
            => _repository = repository;

        public async Task<ErrorOr<IEnumerable<DestinationDto>>> Handle(GetAllDestinationsQuery request, CancellationToken ct)
        {
            var destinations = await _repository.Query()
                .Where(d => !d.IsDeleted)
                .OrderBy(d => d.Name)
                .Include(d => d.State)
                .Include(d => d.Country)
                .Select(d => d.ToDto())
                .ToListAsync(ct);

            return destinations;
        }
    }
}
