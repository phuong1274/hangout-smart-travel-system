using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.States.Queries
{
    public record GetStatesByCountryQuery(string CountryId) : IRequest<ErrorOr<IEnumerable<StateDto>>>;

    public class GetStatesByCountryQueryHandler : IRequestHandler<GetStatesByCountryQuery, ErrorOr<IEnumerable<StateDto>>>
    {
        private readonly IRepository<State> _repository;

        public GetStatesByCountryQueryHandler(IRepository<State> repository)
            => _repository = repository;

        public async Task<ErrorOr<IEnumerable<StateDto>>> Handle(GetStatesByCountryQuery request, CancellationToken ct)
        {
            var states = await _repository.Query()
                .Where(s => !s.IsDeleted && s.CountryId == request.CountryId)
                .OrderBy(s => s.Name)
                .Select(s => new StateDto(s.Id, s.Name, s.Code, s.CountryId, s.CreatedAt, s.UpdatedAt))
                .ToListAsync(ct);

            return states;
        }
    }
}
