using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Commands
{
    public record DeleteModeratedReviewCommand(int ReviewId, string? ResolutionNote) : IRequest<ErrorOr<Unit>>;

    public class DeleteModeratedReviewCommandHandler : IRequestHandler<DeleteModeratedReviewCommand, ErrorOr<Unit>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public DeleteModeratedReviewCommandHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<Unit>> Handle(DeleteModeratedReviewCommand request, CancellationToken cancellationToken)
        {
            var review = await _ctx.LocationReviews.FirstOrDefaultAsync(r => r.Id == request.ReviewId && !r.IsDeleted, cancellationToken);
            if (review is null)
                return Error.NotFound("Review.NotFound", "Review not found.");

            review.Status = LocationReviewStatus.Deleted;
            review.IsDeleted = true;

            var pending = await _ctx.LocationReviewReports
                .Where(rep => !rep.IsDeleted && rep.LocationReviewId == request.ReviewId && rep.Status == LocationReviewReportStatus.Pending)
                .ToListAsync(cancellationToken);

            foreach (var report in pending)
            {
                report.Status = LocationReviewReportStatus.Resolved;
                report.ProcessedByUserId = _currentUser.UserId;
                report.ProcessedAt = DateTime.UtcNow;
                report.ResolutionNote = request.ResolutionNote;
            }

            await _ctx.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
