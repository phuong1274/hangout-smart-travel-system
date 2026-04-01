using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Provinces.Queries
{
    public record GetProvincesByCountryQuery(string CountryId) : IRequest<ErrorOr<IEnumerable<ProvinceDto>>>;

    public class GetProvincesByCountryQueryHandler : IRequestHandler<GetProvincesByCountryQuery, ErrorOr<IEnumerable<ProvinceDto>>>
    {
        private readonly IRepository<Province> _repository;

        public GetProvincesByCountryQueryHandler(IRepository<Province> repository)
            => _repository = repository;

        public async Task<ErrorOr<IEnumerable<ProvinceDto>>> Handle(GetProvincesByCountryQuery request, CancellationToken ct)
        {
            var provinces = await _repository.Query()
                .Where(p => !p.IsDeleted && p.CountryId == request.CountryId)
                .OrderBy(p => p.Name)
                .Select(p => new ProvinceDto(p.Id, p.Name, p.EnglishName, p.Code, p.Latitude, p.Longitude, p.CountryId, p.CreatedAt, p.UpdatedAt))
                .ToListAsync(ct);

            return provinces;
        }
    }
}
