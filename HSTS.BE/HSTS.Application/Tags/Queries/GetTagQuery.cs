using HSTS.Application.Interfaces;
using HSTS.Application.Tags;
using HSTS.Domain.Entities;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Tags.Queries
{
    public record GetTagQuery(int Id) : IRequest<ErrorOr<TagDto>>;

    public class GetTagQueryHandler : IRequestHandler<GetTagQuery, ErrorOr<TagDto>>
    {
        private readonly IRepository<Tag> _repository;

        public GetTagQueryHandler(IRepository<Tag> repository)
            => _repository = repository;

        public async Task<ErrorOr<TagDto>> Handle(GetTagQuery request, CancellationToken ct)
        {
            var tag = await _repository.GetAsync(request.Id, ct);

            if (tag is null || tag.IsDeleted)
            {
                return Error.NotFound("Tag.NotFound", $"Tag with ID {request.Id} not found.");
            }

            return tag.ToDto();
        }
    }
}
