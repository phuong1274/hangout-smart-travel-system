using HSTS.Application.Interfaces;
using HSTS.Application.Tags;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Tags.Queries
{
    public record TagPagedResponse(IEnumerable<TagDto> Items, int TotalCount);

    public record GetTagsPagingQuery(string? SearchTerm, int PageIndex, int PageSize)
        : IRequest<ErrorOr<TagPagedResponse>>;

    public class GetTagsPagingQueryHandler : IRequestHandler<GetTagsPagingQuery, ErrorOr<TagPagedResponse>>
    {
        private readonly IRepository<Tag> _repository;

        public GetTagsPagingQueryHandler(IRepository<Tag> repository)
            => _repository = repository;

        public async Task<ErrorOr<TagPagedResponse>> Handle(GetTagsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query();

            query = query.Where(t => !t.IsDeleted);

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(t => t.Name.Contains(request.SearchTerm));
            }

            query = query.OrderByDescending(t => t.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            var tagDtos = items.Select(t => t.ToDto()).ToList();

            return new TagPagedResponse(tagDtos, total);
        }
    }
}
