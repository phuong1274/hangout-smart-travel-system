using HSTS.Application.Destinations;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Destinations.Queries
{
    public record DestinationPagedResponse(IEnumerable<DestinationDto> Items, int TotalCount);

    public record GetDestinationsPagingQuery(string? SearchTerm, int PageIndex, int PageSize)
        : IRequest<ErrorOr<DestinationPagedResponse>>;

    public class GetDestinationsPagingQueryHandler : IRequestHandler<GetDestinationsPagingQuery, ErrorOr<DestinationPagedResponse>>
    {
        private readonly IRepository<Destination> _repository;

        public GetDestinationsPagingQueryHandler(IRepository<Destination> repository)
            => _repository = repository;

        public async Task<ErrorOr<DestinationPagedResponse>> Handle(GetDestinationsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query();

            query = query.Where(d => !d.IsDeleted);

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(d => d.Name.Contains(request.SearchTerm));
            }

            query = query.OrderByDescending(d => d.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            var destinationDtos = items.Select(d => d.ToDto()).ToList();

            return new DestinationPagedResponse(destinationDtos, total);
        }
    }
}
