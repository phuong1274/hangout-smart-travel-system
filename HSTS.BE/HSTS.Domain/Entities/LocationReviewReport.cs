using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class LocationReviewReport : BaseEntity
    {
        public int Id { get; set; }
        public int LocationReviewId { get; set; }
        public int ReporterUserId { get; set; }
        public LocationReviewReportReason Reason { get; set; }
        public string? Description { get; set; }
        public LocationReviewReportStatus Status { get; set; } = LocationReviewReportStatus.Pending;
        public int? ProcessedByUserId { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? ResolutionNote { get; set; }

        public LocationReview LocationReview { get; set; } = null!;
        public User Reporter { get; set; } = null!;
    }
}
