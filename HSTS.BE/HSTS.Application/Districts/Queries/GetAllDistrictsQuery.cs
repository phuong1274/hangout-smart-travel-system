using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Districts.Queries
{
    public record GetAllDistrictsQuery() : IRequest<ErrorOr<IEnumerable<DistrictDto>>>;

    public class GetAllDistrictsQueryHandler : IRequestHandler<GetAllDistrictsQuery, ErrorOr<IEnumerable<DistrictDto>>>
    {
        private readonly IRepository<District> _repository;

        public GetAllDistrictsQueryHandler(IRepository<District> repository)
            => _repository = repository;

        public async Task<ErrorOr<IEnumerable<DistrictDto>>> Handle(GetAllDistrictsQuery request, CancellationToken ct)
        {
            var districts = await _repository.Query()
                .Where(d => !d.IsDeleted)
                .OrderBy(d => d.Name)
                .Include(d => d.Province)
                .Select(d => d.ToDto())
                .ToListAsync(ct);

            return districts;
        }
    }
}
