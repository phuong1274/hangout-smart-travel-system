using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Tags.Queries
{
    public record GetAllTagsQuery() : IRequest<ErrorOr<IEnumerable<TagDto>>>;

    public class GetAllTagsQueryHandler : IRequestHandler<GetAllTagsQuery, ErrorOr<IEnumerable<TagDto>>>
    {
        private readonly IRepository<Tag> _repository;

        public GetAllTagsQueryHandler(IRepository<Tag> repository)
            => _repository = repository;

        public async Task<ErrorOr<IEnumerable<TagDto>>> Handle(GetAllTagsQuery request, CancellationToken ct)
        {
            var tags = await _repository.Query()
                .Where(t => !t.IsDeleted)
                .OrderBy(t => t.Name)
                .Select(t => t.ToDto())
                .ToListAsync(ct);

            return tags;
        }
    }
}
