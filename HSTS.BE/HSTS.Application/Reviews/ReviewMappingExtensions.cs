using HSTS.Domain.Entities;

namespace HSTS.Application.Reviews
{
    public static class ReviewMappingExtensions
    {
        public static ReviewDto ToPublicDto(this LocationReview review)
        {
            var anon = review.IsAnonymous;
            return new ReviewDto(
                Id: review.Id,
                LocationId: review.LocationId,
                AuthorUserId: anon ? null : review.UserId,
                AuthorDisplayName: anon ? "Anonymous Traveler" : review.User?.FullName,
                AuthorAvatarUrl: anon ? null : review.User?.AvatarUrl,
                IsAnonymous: review.IsAnonymous,
                Rating: review.Rating,
                Comment: review.Comment,
                Status: review.Status,
                ReportCount: review.ReportCount,
                CreatedAt: review.CreatedAt,
                UpdatedAt: review.UpdatedAt);
        }

        public static ReviewDto ToOwnerDto(this LocationReview review) =>
            new(
                Id: review.Id,
                LocationId: review.LocationId,
                AuthorUserId: review.UserId,
                AuthorDisplayName: review.User?.FullName,
                AuthorAvatarUrl: review.User?.AvatarUrl,
                IsAnonymous: review.IsAnonymous,
                Rating: review.Rating,
                Comment: review.Comment,
                Status: review.Status,
                ReportCount: review.ReportCount,
                CreatedAt: review.CreatedAt,
                UpdatedAt: review.UpdatedAt);

        public static ReviewReportDto ToDto(this LocationReviewReport report) =>
            new(
                Id: report.Id,
                LocationReviewId: report.LocationReviewId,
                ReporterUserId: report.ReporterUserId,
                Reason: report.Reason,
                Description: report.Description,
                Status: report.Status,
                CreatedAt: report.CreatedAt);
    }
}
