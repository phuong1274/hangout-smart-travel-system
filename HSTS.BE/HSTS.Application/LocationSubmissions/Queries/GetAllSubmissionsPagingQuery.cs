using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Queries
{
    public record GetAllSubmissionsPagingQuery(string? SearchTerm, SubmissionStatus? Status, int PageIndex = 1, int PageSize = 10)
        : IRequest<ErrorOr<LocationSubmissionPagedResponse>>;

    public class GetAllSubmissionsPagingQueryHandler : IRequestHandler<GetAllSubmissionsPagingQuery, ErrorOr<LocationSubmissionPagedResponse>>
    {
        private readonly IRepository<LocationSubmission> _repository;

        public GetAllSubmissionsPagingQueryHandler(IRepository<LocationSubmission> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationSubmissionPagedResponse>> Handle(GetAllSubmissionsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(s => s.Destination)
                .Include(s => s.LocationType)
                .AsQueryable();

            query = query.Where(s => !s.IsDeleted);

            if (request.Status.HasValue)
            {
                query = query.Where(s => s.Status == request.Status.Value);
            }

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.ToLower();
                query = query.Where(s =>
                    s.Name.ToLower().Contains(searchTerm) ||
                    (s.Description != null && s.Description.ToLower().Contains(searchTerm)) ||
                    s.Address.ToLower().Contains(searchTerm));
            }

            query = query.OrderByDescending(s => s.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            var submissionDtos = items.Select(s => s.ToDto()).ToList();

            return new LocationSubmissionPagedResponse(submissionDtos, total);
        }
    }
}
