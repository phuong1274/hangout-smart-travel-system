using ErrorOr;
using MediatR;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Commands
{
    public record DeleteLocationCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteLocationCommandHandler : IRequestHandler<DeleteLocationCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<Location> _repository;

        public DeleteLocationCommandHandler(IRepository<Location> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteLocationCommand request, CancellationToken cancellationToken)
        {
            var location = await _repository.GetAsync(request.Id, cancellationToken);

            if (location == null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.Id} not found.");
            }

            location.IsDeleted = true;

            await _repository.UpdateAsync(location, cancellationToken);

            return Result.Deleted;
        }
    }
}
