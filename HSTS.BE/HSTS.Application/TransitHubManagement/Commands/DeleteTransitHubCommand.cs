using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransitHubManagement.Commands
{
    public record DeleteTransitHubCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteTransitHubCommandHandler
        : IRequestHandler<DeleteTransitHubCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<Domain.Entities.TransitHubs> _repository;

        public DeleteTransitHubCommandHandler(IRepository<Domain.Entities.TransitHubs> repository)
            => _repository = repository;

        public async Task<ErrorOr<Deleted>> Handle(
            DeleteTransitHubCommand request, CancellationToken ct)
        {
            var entity = await _repository.GetAsync(request.Id, ct);

            if (entity is null || entity.IsDeleted)
                return Error.NotFound("TransitHub.NotFound",
                    $"Transit hub with ID {request.Id} not found.");

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(entity, ct);
            return Result.Deleted;
        }
    }
}
