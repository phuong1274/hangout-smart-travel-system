using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransportModes.Commands
{
    public record DeleteTransportModeCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteTransportModeCommandHandler
        : IRequestHandler<DeleteTransportModeCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<TransportMode> _repository;

        public DeleteTransportModeCommandHandler(IRepository<TransportMode> repository)
            => _repository = repository;

        public async Task<ErrorOr<Deleted>> Handle(
            DeleteTransportModeCommand request, CancellationToken ct)
        {
            var entity = await _repository.GetAsync(request.Id, ct);

            if (entity is null || entity.IsDeleted)
                return Error.NotFound("TransportMode.NotFound",
                    $"Transport mode with ID {request.Id} not found.");

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(entity, ct);
            return Result.Deleted;
        }
    }
}
