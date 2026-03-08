using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Amenities.Queries
{
    public record AmenityPagedResponse(IEnumerable<AmenityDto> Items, int TotalCount);

    public record GetAmenitiesPagingQuery(string? SearchTerm, int PageIndex, int PageSize)
        : IRequest<ErrorOr<AmenityPagedResponse>>;

    public class GetAmenitiesPagingQueryHandler : IRequestHandler<GetAmenitiesPagingQuery, ErrorOr<AmenityPagedResponse>>
    {
        private readonly IRepository<Amenity> _repository;

        public GetAmenitiesPagingQueryHandler(IRepository<Amenity> repository)
            => _repository = repository;

        public async Task<ErrorOr<AmenityPagedResponse>> Handle(GetAmenitiesPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .AsQueryable();

            query = query.Where(a => !a.IsDeleted);

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(a => a.Name.Contains(request.SearchTerm) || 
                    (a.Description != null && a.Description.Contains(request.SearchTerm)));
            }

            query = query.OrderByDescending(a => a.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            var amenityDtos = items.Select(a => a.ToDto()).ToList();

            return new AmenityPagedResponse(amenityDtos, total);
        }
    }
}
