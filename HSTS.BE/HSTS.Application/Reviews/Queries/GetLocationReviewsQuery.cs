using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Queries
{
    public record GetLocationReviewsQuery(int LocationId, int PageIndex = 1, int PageSize = 10)
        : IRequest<ErrorOr<ReviewPagedResponse>>;

    public class GetLocationReviewsQueryHandler : IRequestHandler<GetLocationReviewsQuery, ErrorOr<ReviewPagedResponse>>
    {
        private readonly IAppDbContext _ctx;

        public GetLocationReviewsQueryHandler(IAppDbContext ctx) => _ctx = ctx;

        public async Task<ErrorOr<ReviewPagedResponse>> Handle(GetLocationReviewsQuery request, CancellationToken cancellationToken)
        {
            var query = _ctx.LocationReviews
                .Include(r => r.User)
                .Where(r => !r.IsDeleted
                    && r.LocationId == request.LocationId
                    && r.Status == LocationReviewStatus.Visible)
                .OrderByDescending(r => r.CreatedAt);

            var total = await query.CountAsync(cancellationToken);
            var items = await query
                .Skip((request.PageIndex - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(r => r.ToPublicDto())
                .ToListAsync(cancellationToken);

            return new ReviewPagedResponse(items, total);
        }
    }
}
