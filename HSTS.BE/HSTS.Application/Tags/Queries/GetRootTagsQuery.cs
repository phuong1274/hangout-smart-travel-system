using ErrorOr;
using MediatR;
using HSTS.Application.Interfaces;
using static HSTS.Application.Interfaces.IRepository;
using HSTS.Application.Tags;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Tags.Queries
{
    public record GetRootTagsQuery() : IRequest<ErrorOr<List<TagDto>>>;

    public class GetRootTagsQueryHandler : IRequestHandler<GetRootTagsQuery, ErrorOr<List<TagDto>>>
    {
        private readonly IRepository<Tag> _repository;

        public GetRootTagsQueryHandler(IRepository<Tag> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<List<TagDto>>> Handle(GetRootTagsQuery request, CancellationToken ct)
        {
            var rootTags = await _repository.Query()
                .Where(t => t.Level == 1 && !t.IsDeleted)
                .OrderBy(t => t.Name)
                .ToListAsync(ct);

            return rootTags.Select(t => t.ToDto()).ToList();
        }
    }
}
