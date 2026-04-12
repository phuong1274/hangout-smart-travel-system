using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Queries
{
    public record GetReportedReviewDetailQuery(int ReviewId) : IRequest<ErrorOr<ModeratedReviewDto>>;

    public class GetReportedReviewDetailQueryHandler : IRequestHandler<GetReportedReviewDetailQuery, ErrorOr<ModeratedReviewDto>>
    {
        private readonly IAppDbContext _ctx;

        public GetReportedReviewDetailQueryHandler(IAppDbContext ctx) => _ctx = ctx;

        public async Task<ErrorOr<ModeratedReviewDto>> Handle(GetReportedReviewDetailQuery request, CancellationToken cancellationToken)
        {
            var review = await _ctx.LocationReviews
                .Include(r => r.User).ThenInclude(u => u.Account)
                .Include(r => r.Location)
                .Include(r => r.Reports.Where(rep => !rep.IsDeleted))
                .FirstOrDefaultAsync(r => r.Id == request.ReviewId && !r.IsDeleted, cancellationToken);

            if (review is null)
                return Error.NotFound("Review.NotFound", "Review not found.");

            return new ModeratedReviewDto(
                Review: review.ToOwnerDto(),
                LocationName: review.Location?.Name ?? string.Empty,
                AuthorEmail: review.User?.Account?.Email ?? string.Empty,
                Reports: review.Reports.Where(rep => !rep.IsDeleted).OrderByDescending(rep => rep.CreatedAt).Select(rep => rep.ToDto()).ToList());
        }
    }
}
