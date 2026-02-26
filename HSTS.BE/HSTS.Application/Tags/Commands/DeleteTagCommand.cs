using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Tags.Commands
{
    public record DeleteTagCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteTagCommandHandler : IRequestHandler<DeleteTagCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<Tag> _repository;

        public DeleteTagCommandHandler(IRepository<Tag> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteTagCommand request, CancellationToken cancellationToken)
        {
            var tag = await _repository.GetAsync(request.Id, cancellationToken);

            if (tag == null || tag.IsDeleted)
            {
                return Error.NotFound("Tag.NotFound", "Tag not found.");
            }

            tag.IsDeleted = true;

            await _repository.UpdateAsync(tag, cancellationToken);

            return Result.Deleted;
        }
    }
}
