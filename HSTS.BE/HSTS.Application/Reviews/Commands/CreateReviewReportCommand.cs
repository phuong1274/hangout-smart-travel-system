using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Commands
{
    public record CreateReviewReportCommand(int ReviewId, LocationReviewReportReason Reason, string? Description) : IRequest<ErrorOr<Unit>>;

    public class CreateReviewReportCommandHandler : IRequestHandler<CreateReviewReportCommand, ErrorOr<Unit>>
    {
        public const int AutoHideThreshold = 5;
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public CreateReviewReportCommandHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<Unit>> Handle(CreateReviewReportCommand request, CancellationToken cancellationToken)
        {
            var reporterId = _currentUser.UserId;

            var review = await _ctx.LocationReviews.FirstOrDefaultAsync(r => r.Id == request.ReviewId && !r.IsDeleted, cancellationToken);
            if (review is null || review.Status == LocationReviewStatus.Deleted)
                return Error.NotFound("Review.NotFound", "Review not found.");

            if (review.UserId == reporterId)
                return Error.Forbidden("ReviewReport.SelfReport", "You cannot report your own review.");

            var alreadyReported = await _ctx.LocationReviewReports.AnyAsync(r => !r.IsDeleted && r.LocationReviewId == request.ReviewId && r.ReporterUserId == reporterId, cancellationToken);
            if (alreadyReported)
                return Error.Conflict("ReviewReport.AlreadyReported", "You already reported this review.");

            _ctx.LocationReviewReports.Add(new LocationReviewReport
            {
                LocationReviewId = request.ReviewId,
                ReporterUserId = reporterId,
                Reason = request.Reason,
                Description = request.Description,
                Status = LocationReviewReportStatus.Pending
            });

            review.ReportCount += 1;
            if (review.ReportCount >= AutoHideThreshold && review.Status == LocationReviewStatus.Visible)
            {
                review.Status = LocationReviewStatus.Hidden;
                review.HiddenAt = DateTime.UtcNow;
            }

            await _ctx.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }

    public class CreateReviewReportCommandValidator : AbstractValidator<CreateReviewReportCommand>
    {
        public CreateReviewReportCommandValidator()
        {
            RuleFor(x => x.ReviewId).GreaterThan(0);
            RuleFor(x => x.Reason).IsInEnum();
            RuleFor(x => x.Description).MaximumLength(1000).When(x => x.Description is not null);
        }
    }
}
