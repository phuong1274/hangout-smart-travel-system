using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using ErrorOr;
using MediatR;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Queries
{
    public record GetLocationTypeQuery(int Id)
        : IRequest<ErrorOr<LocationTypeDto>>;

    public class GetLocationTypeQueryHandler : IRequestHandler<GetLocationTypeQuery, ErrorOr<LocationTypeDto>>
    {
        private readonly IRepository<LocationType> _repository;

        public GetLocationTypeQueryHandler(IRepository<LocationType> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<LocationTypeDto>> Handle(GetLocationTypeQuery request, CancellationToken cancellationToken)
        {
            var locationType = await _repository.Query()
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, cancellationToken);

            if (locationType == null)
            {
                return Error.NotFound(
                    "LocationType.NotFound",
                    $"Location type with ID {request.Id} not found.");
            }

            return locationType.ToDto();
        }
    }
}
