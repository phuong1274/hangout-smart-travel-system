using HSTS.Domain.Entities;
using HSTS.Domain.Enums;

namespace HSTS.Tests.Helpers;

public static class ReviewFakes
{
    public static LocationReview Visible(int id, int locationId, int userId, int rating = 5, string comment = "Great place!", bool anonymous = false) =>
        new()
        {
            Id = id,
            LocationId = locationId,
            UserId = userId,
            Rating = rating,
            Comment = comment,
            IsAnonymous = anonymous,
            Status = LocationReviewStatus.Visible,
            ReportCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

    public static LocationReview Hidden(int id, int locationId, int userId) =>
        new()
        {
            Id = id,
            LocationId = locationId,
            UserId = userId,
            Rating = 1,
            Comment = "Hidden review",
            Status = LocationReviewStatus.Hidden,
            ReportCount = 5,
            HiddenAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

    public static LocationReviewReport PendingReport(int id, int reviewId, int reporterId, LocationReviewReportReason reason = LocationReviewReportReason.Spam) =>
        new()
        {
            Id = id,
            LocationReviewId = reviewId,
            ReporterUserId = reporterId,
            Reason = reason,
            Status = LocationReviewReportStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
}
