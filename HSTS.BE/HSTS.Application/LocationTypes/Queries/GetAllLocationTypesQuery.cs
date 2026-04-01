using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using ErrorOr;
using MediatR;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationTypes.Queries
{
    public record GetAllLocationTypesQuery()
        : IRequest<ErrorOr<IEnumerable<LocationTypeDto>>>;

    public class GetAllLocationTypesQueryHandler : IRequestHandler<GetAllLocationTypesQuery, ErrorOr<IEnumerable<LocationTypeDto>>>
    {
        private readonly IRepository<LocationType> _repository;

        public GetAllLocationTypesQueryHandler(IRepository<LocationType> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<IEnumerable<LocationTypeDto>>> Handle(GetAllLocationTypesQuery request, CancellationToken cancellationToken)
        {
            var locationTypes = await _repository.Query()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.Name)
                .Select(x => x.ToDto())
                .ToListAsync(cancellationToken);

            return locationTypes;
        }
    }
}
