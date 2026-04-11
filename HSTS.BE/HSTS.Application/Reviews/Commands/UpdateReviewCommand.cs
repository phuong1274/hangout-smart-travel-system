using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Commands
{
    public record UpdateReviewCommand(int ReviewId, int Rating, string Comment, bool IsAnonymous) : IRequest<ErrorOr<ReviewDto>>;

    public class UpdateReviewCommandHandler : IRequestHandler<UpdateReviewCommand, ErrorOr<ReviewDto>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public UpdateReviewCommandHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<ReviewDto>> Handle(UpdateReviewCommand request, CancellationToken cancellationToken)
        {
            var review = await _ctx.LocationReviews.FirstOrDefaultAsync(r => r.Id == request.ReviewId && !r.IsDeleted, cancellationToken);
            if (review is null || review.Status == LocationReviewStatus.Deleted)
                return Error.NotFound("Review.NotFound", "Review not found.");

            if (review.UserId != _currentUser.UserId)
                return Error.Forbidden("Review.Forbidden", "You can only edit your own review.");

            review.Rating = request.Rating;
            review.Comment = request.Comment;
            review.IsAnonymous = request.IsAnonymous;

            await _ctx.SaveChangesAsync(cancellationToken);
            return review.ToOwnerDto();
        }
    }

    public class UpdateReviewCommandValidator : AbstractValidator<UpdateReviewCommand>
    {
        public UpdateReviewCommandValidator()
        {
            RuleFor(x => x.ReviewId).GreaterThan(0);
            RuleFor(x => x.Rating).InclusiveBetween(1, 5);
            RuleFor(x => x.Comment).NotEmpty().MaximumLength(2000);
        }
    }
}
