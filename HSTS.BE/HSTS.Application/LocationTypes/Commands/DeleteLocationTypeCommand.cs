using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Commands
{
    public record DeleteLocationTypeCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteLocationTypeCommandHandler : IRequestHandler<DeleteLocationTypeCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<LocationType> _repository;

        public DeleteLocationTypeCommandHandler(IRepository<LocationType> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteLocationTypeCommand request, CancellationToken cancellationToken)
        {
            var locationType = await _repository.GetAsync(request.Id, cancellationToken);

            if (locationType == null || locationType.IsDeleted)
            {
                return Error.NotFound("LocationType.NotFound", "Location type not found.");
            }

            locationType.IsDeleted = true;

            await _repository.UpdateAsync(locationType, cancellationToken);

            return Result.Deleted;
        }
    }
}
