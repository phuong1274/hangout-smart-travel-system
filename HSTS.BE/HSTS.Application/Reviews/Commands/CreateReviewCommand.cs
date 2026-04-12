using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Commands
{
    public record CreateReviewCommand(int LocationId, int Rating, string Comment, bool IsAnonymous) : IRequest<ErrorOr<ReviewDto>>;

    public class CreateReviewCommandHandler : IRequestHandler<CreateReviewCommand, ErrorOr<ReviewDto>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public CreateReviewCommandHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<ReviewDto>> Handle(CreateReviewCommand request, CancellationToken cancellationToken)
        {
            var locationExists = await _ctx.Locations.AnyAsync(l => l.Id == request.LocationId && !l.IsDeleted, cancellationToken);
            if (!locationExists)
                return Error.NotFound("Location.NotFound", "Location not found.");

            var duplicate = await _ctx.LocationReviews.AnyAsync(r => !r.IsDeleted && r.LocationId == request.LocationId && r.UserId == _currentUser.UserId && r.Status != LocationReviewStatus.Deleted, cancellationToken);
            if (duplicate)
                return Error.Conflict("Review.AlreadyExists", "You already reviewed this location.");

            var review = new LocationReview
            {
                LocationId = request.LocationId,
                UserId = _currentUser.UserId,
                Rating = request.Rating,
                Comment = request.Comment,
                IsAnonymous = request.IsAnonymous,
                Status = LocationReviewStatus.Visible
            };

            _ctx.LocationReviews.Add(review);
            await _ctx.SaveChangesAsync(cancellationToken);

            return review.ToOwnerDto();
        }
    }

    public class CreateReviewCommandValidator : AbstractValidator<CreateReviewCommand>
    {
        public CreateReviewCommandValidator()
        {
            RuleFor(x => x.LocationId).GreaterThan(0);
            RuleFor(x => x.Rating).InclusiveBetween(1, 5);
            RuleFor(x => x.Comment).NotEmpty().MaximumLength(2000);
        }
    }
}
