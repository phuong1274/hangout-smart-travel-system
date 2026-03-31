using ErrorOr;
using MediatR;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Tags.Commands
{
    public record DeleteTagCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteTagCommandHandler : IRequestHandler<DeleteTagCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<Tag> _repository;
        private readonly IRepository<LocationTag> _locationTagRepository;

        public DeleteTagCommandHandler(IRepository<Tag> repository, IRepository<LocationTag> locationTagRepository)
        {
            _repository = repository;
            _locationTagRepository = locationTagRepository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteTagCommand request, CancellationToken cancellationToken)
        {
            var tag = await _repository.GetAsync(request.Id, cancellationToken);

            if (tag == null || tag.IsDeleted)
            {
                return Error.NotFound("Tag.NotFound", "Tag not found.");
            }

            // Check if tag is in use by any location
            var isInUse = await _locationTagRepository.Query()
                .AnyAsync(lt => lt.TagId == request.Id && !lt.IsDeleted, cancellationToken);

            if (isInUse)
            {
                return Error.Validation("Tag.InUse", "Cannot delete tag that is currently in use by one or more locations.");
            }

            tag.IsDeleted = true;

            await _repository.UpdateAsync(tag, cancellationToken);

            return Result.Deleted;
        }
    }
}
