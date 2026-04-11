using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Commands
{
    public record DeleteReviewCommand(int ReviewId) : IRequest<ErrorOr<Unit>>;

    public class DeleteReviewCommandHandler : IRequestHandler<DeleteReviewCommand, ErrorOr<Unit>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public DeleteReviewCommandHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<Unit>> Handle(DeleteReviewCommand request, CancellationToken cancellationToken)
        {
            var review = await _ctx.LocationReviews.FirstOrDefaultAsync(r => r.Id == request.ReviewId && !r.IsDeleted, cancellationToken);
            if (review is null)
                return Error.NotFound("Review.NotFound", "Review not found.");

            if (review.UserId != _currentUser.UserId)
                return Error.Forbidden("Review.Forbidden", "You can only delete your own review.");

            review.Status = LocationReviewStatus.Deleted;
            review.IsDeleted = true;
            await _ctx.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
