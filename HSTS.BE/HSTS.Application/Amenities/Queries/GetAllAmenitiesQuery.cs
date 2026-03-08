using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Amenities.Queries
{
    public record GetAllAmenitiesQuery() : IRequest<ErrorOr<IEnumerable<AmenityDto>>>;

    public class GetAllAmenitiesQueryHandler : IRequestHandler<GetAllAmenitiesQuery, ErrorOr<IEnumerable<AmenityDto>>>
    {
        private readonly IRepository<Amenity> _repository;

        public GetAllAmenitiesQueryHandler(IRepository<Amenity> repository)
            => _repository = repository;

        public async Task<ErrorOr<IEnumerable<AmenityDto>>> Handle(GetAllAmenitiesQuery request, CancellationToken ct)
        {
            var amenities = await _repository.Query()
                .Where(a => !a.IsDeleted)
                .OrderBy(a => a.Name)
                .Select(a => a.ToDto())
                .ToListAsync(ct);

            return amenities;
        }
    }
}
