using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Amenities.Queries
{
    public record GetAmenityQuery(int Id) : IRequest<ErrorOr<AmenityDto>>;

    public class GetAmenityQueryHandler : IRequestHandler<GetAmenityQuery, ErrorOr<AmenityDto>>
    {
        private readonly IRepository<Amenity> _repository;

        public GetAmenityQueryHandler(IRepository<Amenity> repository)
            => _repository = repository;

        public async Task<ErrorOr<AmenityDto>> Handle(GetAmenityQuery request, CancellationToken ct)
        {
            var amenity = await _repository.Query()
                .FirstOrDefaultAsync(a => a.Id == request.Id && !a.IsDeleted, ct);

            if (amenity is null)
            {
                return Error.NotFound("Amenity.NotFound", $"Amenity with ID {request.Id} not found.");
            }

            return amenity.ToDto();
        }
    }
}
