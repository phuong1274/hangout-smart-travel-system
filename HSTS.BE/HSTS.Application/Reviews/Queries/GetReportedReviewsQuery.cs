using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Queries
{
    public record GetReportedReviewsQuery(int PageIndex = 1, int PageSize = 10)
        : IRequest<ErrorOr<ModeratedReviewPagedResponse>>;

    public class GetReportedReviewsQueryHandler : IRequestHandler<GetReportedReviewsQuery, ErrorOr<ModeratedReviewPagedResponse>>
    {
        private readonly IAppDbContext _ctx;

        public GetReportedReviewsQueryHandler(IAppDbContext ctx) => _ctx = ctx;

        public async Task<ErrorOr<ModeratedReviewPagedResponse>> Handle(GetReportedReviewsQuery request, CancellationToken cancellationToken)
        {
            var query = _ctx.LocationReviews
                .Include(r => r.User).ThenInclude(u => u.Account)
                .Include(r => r.Location)
                .Include(r => r.Reports.Where(rep => !rep.IsDeleted))
                .Where(r => !r.IsDeleted && (r.ReportCount > 0 || r.Status == LocationReviewStatus.Hidden))
                .OrderByDescending(r => r.ReportCount)
                .ThenByDescending(r => r.UpdatedAt);

            var total = await query.CountAsync(cancellationToken);
            var rows = await query
                .Skip((request.PageIndex - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync(cancellationToken);

            var items = rows.Select(r => new ModeratedReviewDto(
                Review: r.ToOwnerDto(),
                LocationName: r.Location?.Name ?? string.Empty,
                AuthorEmail: r.User?.Account?.Email ?? string.Empty,
                Reports: r.Reports.Where(rep => !rep.IsDeleted).OrderByDescending(rep => rep.CreatedAt).Select(rep => rep.ToDto()).ToList())).ToList();

            return new ModeratedReviewPagedResponse(items, total);
        }
    }
}
