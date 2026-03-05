using HSTS.Application.Destinations;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Destinations.Queries
{
    public record GetDestinationQuery(int Id) : IRequest<ErrorOr<DestinationDto>>;

    public class GetDestinationQueryHandler : IRequestHandler<GetDestinationQuery, ErrorOr<DestinationDto>>
    {
        private readonly IRepository<Destination> _repository;

        public GetDestinationQueryHandler(IRepository<Destination> repository)
            => _repository = repository;

        public async Task<ErrorOr<DestinationDto>> Handle(GetDestinationQuery request, CancellationToken ct)
        {
            var destination = await _repository.GetAsync(request.Id, ct);

            if (destination is null || destination.IsDeleted)
            {
                return Error.NotFound("Destination.NotFound", $"Destination with ID {request.Id} not found.");
            }

            return destination.ToDto();
        }
    }
}
