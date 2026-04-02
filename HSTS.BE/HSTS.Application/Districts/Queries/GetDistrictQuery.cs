using ErrorOr;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Districts.Queries
{
    public record GetDistrictQuery(int Id) : IRequest<ErrorOr<DistrictDto>>;

    public class GetDistrictQueryHandler : IRequestHandler<GetDistrictQuery, ErrorOr<DistrictDto>>
    {
        private readonly IRepository<District> _repository;

        public GetDistrictQueryHandler(IRepository<District> repository)
            => _repository = repository;

        public async Task<ErrorOr<DistrictDto>> Handle(GetDistrictQuery request, CancellationToken ct)
        {
            var district = await _repository.Query()
                .Where(d => d.Id == request.Id && !d.IsDeleted)
                .Include(d => d.Province)
                .FirstOrDefaultAsync(ct);

            if (district is null)
            {
                return Error.NotFound("District.NotFound", $"District with ID {request.Id} not found.");
            }

            return district.ToDto();
        }
    }
}
