using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Queries
{
    public record LocationSubmissionPagedResponse(IEnumerable<LocationSubmissionDto> Items, int TotalCount);

    public record GetMySubmissionsQuery(
        int UserId,
        SubmissionStatus? Status,
        DateTime? FromDate,
        DateTime? ToDate,
        int PageIndex = 1,
        int PageSize = 10) : IRequest<ErrorOr<LocationSubmissionPagedResponse>>;

    public class GetMySubmissionsQueryHandler : IRequestHandler<GetMySubmissionsQuery, ErrorOr<LocationSubmissionPagedResponse>>
    {
        private readonly IRepository<LocationSubmission> _repository;

        public GetMySubmissionsQueryHandler(IRepository<LocationSubmission> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationSubmissionPagedResponse>> Handle(GetMySubmissionsQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(s => s.Destination)
                .AsQueryable();

            query = query.Where(s => !s.IsDeleted && s.UserId == request.UserId);

            // Filter by status
            if (request.Status.HasValue)
            {
                query = query.Where(s => s.Status == request.Status.Value);
            }

            // Filter by date range (CreatedAt)
            if (request.FromDate.HasValue)
            {
                query = query.Where(s => s.CreatedAt >= request.FromDate.Value);
            }
            if (request.ToDate.HasValue)
            {
                query = query.Where(s => s.CreatedAt <= request.ToDate.Value);
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
