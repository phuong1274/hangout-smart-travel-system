using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Commands
{
    public record UnhideReviewCommand(int ReviewId) : IRequest<ErrorOr<Unit>>;

    public class UnhideReviewCommandHandler : IRequestHandler<UnhideReviewCommand, ErrorOr<Unit>>
    {
        private readonly IAppDbContext _ctx;

        public UnhideReviewCommandHandler(IAppDbContext ctx) => _ctx = ctx;

        public async Task<ErrorOr<Unit>> Handle(UnhideReviewCommand request, CancellationToken cancellationToken)
        {
            var review = await _ctx.LocationReviews.FirstOrDefaultAsync(r => r.Id == request.ReviewId && !r.IsDeleted, cancellationToken);
            if (review is null)
                return Error.NotFound("Review.NotFound", "Review not found.");

            review.Status = LocationReviewStatus.Visible;
            review.HiddenAt = null;
            review.HiddenByUserId = null;

            await _ctx.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
