using ErrorOr;
using MediatR;
using HSTS.Application.Interfaces;
using static HSTS.Application.Interfaces.IRepository;
using HSTS.Application.Tags;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Tags.Queries
{
    public record GetChildTagsByParentIdQuery(int ParentTagId) : IRequest<ErrorOr<List<TagDto>>>;

    public class GetChildTagsByParentIdQueryHandler : IRequestHandler<GetChildTagsByParentIdQuery, ErrorOr<List<TagDto>>>
    {
        private readonly IRepository<Tag> _repository;

        public GetChildTagsByParentIdQueryHandler(IRepository<Tag> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<List<TagDto>>> Handle(GetChildTagsByParentIdQuery request, CancellationToken ct)
        {
            // Verify parent tag exists
            var parentTag = await _repository.GetAsync(request.ParentTagId, ct);
            if (parentTag is null || parentTag.IsDeleted)
            {
                return Error.NotFound("Tag.NotFound", $"Parent tag with ID {request.ParentTagId} not found.");
            }

            var childTags = await _repository.Query()
                .Where(t => t.ParentTagId == request.ParentTagId && !t.IsDeleted)
                .OrderBy(t => t.Name)
                .ToListAsync(ct);

            return childTags.Select(t => t.ToDto()).ToList();
        }
    }
}
