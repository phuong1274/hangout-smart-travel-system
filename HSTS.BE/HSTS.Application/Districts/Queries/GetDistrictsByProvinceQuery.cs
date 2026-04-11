using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Districts.Queries
{
    public record GetDistrictsByProvinceQuery(int ProvinceId) : IRequest<ErrorOr<IEnumerable<DistrictDto>>>;

    public class GetDistrictsByProvinceQueryHandler : IRequestHandler<GetDistrictsByProvinceQuery, ErrorOr<IEnumerable<DistrictDto>>>
    {
        private readonly IRepository<District> _repository;

        public GetDistrictsByProvinceQueryHandler(IRepository<District> repository)
            => _repository = repository;

        public async Task<ErrorOr<IEnumerable<DistrictDto>>> Handle(GetDistrictsByProvinceQuery request, CancellationToken ct)
        {
            var districts = await _repository.Query()
                .Where(d => !d.IsDeleted && d.ProvinceId == request.ProvinceId)
                .OrderBy(d => d.Name)
                .Select(d => d.ToDto())
                .ToListAsync(ct);

            return districts;
        }
    }
}
