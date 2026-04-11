using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransportModes.Queries
{
    public record TransportModePagedResponse(IEnumerable<TransportModeDto> Items, int TotalCount);

    public record GetTransportModesPagingQuery(
        string? SearchTerm,
        int? Category,
        int PageIndex,
        int PageSize) : IRequest<ErrorOr<TransportModePagedResponse>>;

    public class GetTransportModesPagingQueryHandler
        : IRequestHandler<GetTransportModesPagingQuery, ErrorOr<TransportModePagedResponse>>
    {
        private readonly IRepository<TransportMode> _repository;

        public GetTransportModesPagingQueryHandler(IRepository<TransportMode> repository)
            => _repository = repository;

        public async Task<ErrorOr<TransportModePagedResponse>> Handle(
            GetTransportModesPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(x => x.LocalTransportMetrics)
                .Where(x => !x.IsDeleted);

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(x => x.Name.Contains(request.SearchTerm));
            }

            if (request.Category.HasValue)
            {
                var category = (Domain.Enums.CategoryTransport)request.Category.Value;
                query = query.Where(x => x.Category == category);
            }

            query = query.OrderByDescending(x => x.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex, request.PageSize, query, ct);

            var dtos = items.Select(x => x.ToDto()).ToList();
            return new TransportModePagedResponse(dtos, total);
        }
    }
}
