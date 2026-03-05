using HSTS.Application.Interfaces;
using HSTS.Application.LocationTypes;
using HSTS.Domain.Entities;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Queries
{
    public record GetLocationTypeQuery(int Id) : IRequest<ErrorOr<LocationTypeDto>>;

    public class GetLocationTypeQueryHandler : IRequestHandler<GetLocationTypeQuery, ErrorOr<LocationTypeDto>>
    {
        private readonly IRepository<LocationType> _repository;

        public GetLocationTypeQueryHandler(IRepository<LocationType> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationTypeDto>> Handle(GetLocationTypeQuery request, CancellationToken ct)
        {
            var locationType = await _repository.GetAsync(request.Id, ct);

            if (locationType is null || locationType.IsDeleted)
            {
                return Error.NotFound("LocationType.NotFound", $"Location type with ID {request.Id} not found.");
            }

            return locationType.ToDto();
        }
    }
}
