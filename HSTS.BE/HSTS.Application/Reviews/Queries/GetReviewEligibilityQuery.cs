using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Queries
{
    public record GetReviewEligibilityQuery(int LocationId) : IRequest<ErrorOr<ReviewEligibilityDto>>;

    public record ReviewEligibilityDto(bool CanReview);

    public class GetReviewEligibilityQueryHandler : IRequestHandler<GetReviewEligibilityQuery, ErrorOr<ReviewEligibilityDto>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public GetReviewEligibilityQueryHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<ReviewEligibilityDto>> Handle(GetReviewEligibilityQuery request, CancellationToken cancellationToken)
        {
            var canReview = await _ctx.TripActivities
                .AnyAsync(a => !a.IsDeleted
                    && a.LocationId == request.LocationId
                    && a.Status == TripActivityStatus.Completed
                    && a.TripDay!.Trip!.Status == TripStatus.Completed
                    && a.TripDay.Trip.TripMembers.Any(m => !m.IsDeleted && m.UserId == _currentUser.UserId),
                    cancellationToken);

            return new ReviewEligibilityDto(canReview);
        }
    }
}
