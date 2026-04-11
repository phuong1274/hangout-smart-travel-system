using HSTS.Domain.Enums;

namespace HSTS.Application.Reviews
{
    public record ReviewDto(
        int Id,
        int LocationId,
        int? AuthorUserId,
        string? AuthorDisplayName,
        string? AuthorAvatarUrl,
        bool IsAnonymous,
        int Rating,
        string Comment,
        LocationReviewStatus Status,
        int ReportCount,
        DateTime CreatedAt,
        DateTime? UpdatedAt);

    public record ReviewReportDto(
        int Id,
        int LocationReviewId,
        int ReporterUserId,
        LocationReviewReportReason Reason,
        string? Description,
        LocationReviewReportStatus Status,
        DateTime CreatedAt);

    public record ModeratedReviewDto(
        ReviewDto Review,
        string LocationName,
        string AuthorEmail,
        IList<ReviewReportDto> Reports);

    public record ReviewPagedResponse(IEnumerable<ReviewDto> Items, int TotalCount);
    public record ModeratedReviewPagedResponse(IEnumerable<ModeratedReviewDto> Items, int TotalCount);
}
