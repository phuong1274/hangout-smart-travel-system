using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Queries
{
    public record GetMyLocationReviewQuery(int LocationId) : IRequest<ErrorOr<ReviewDto?>>;

    public class GetMyLocationReviewQueryHandler : IRequestHandler<GetMyLocationReviewQuery, ErrorOr<ReviewDto?>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public GetMyLocationReviewQueryHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<ReviewDto?>> Handle(GetMyLocationReviewQuery request, CancellationToken cancellationToken)
        {
            var review = await _ctx.LocationReviews
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => !r.IsDeleted
                    && r.LocationId == request.LocationId
                    && r.UserId == _currentUser.UserId
                    && r.Status != LocationReviewStatus.Deleted,
                    cancellationToken);

            return review is null ? null : review.ToOwnerDto();
        }
    }
}
