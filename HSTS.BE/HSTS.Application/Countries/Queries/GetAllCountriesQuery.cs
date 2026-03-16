using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Countries.Queries
{
    public record GetAllCountriesQuery() : IRequest<ErrorOr<IEnumerable<CountryDto>>>;

    public class GetAllCountriesQueryHandler : IRequestHandler<GetAllCountriesQuery, ErrorOr<IEnumerable<CountryDto>>>
    {
        private readonly IRepository<Country> _repository;

        public GetAllCountriesQueryHandler(IRepository<Country> repository)
            => _repository = repository;

        public async Task<ErrorOr<IEnumerable<CountryDto>>> Handle(GetAllCountriesQuery request, CancellationToken ct)
        {
            var countries = await _repository.Query()
                .Where(c => !c.IsDeleted)
                .OrderBy(c => c.Name)
                .Select(c => new CountryDto(c.Id, c.Name, c.Code, c.CreatedAt, c.UpdatedAt))
                .ToListAsync(ct);

            return countries;
        }
    }
}
