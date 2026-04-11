using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class LocationReview : BaseEntity
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public int UserId { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = null!;
        public bool IsAnonymous { get; set; }
        public LocationReviewStatus Status { get; set; } = LocationReviewStatus.Visible;
        public int ReportCount { get; set; }
        public DateTime? HiddenAt { get; set; }
        public int? HiddenByUserId { get; set; }

        public Location Location { get; set; } = null!;
        public User User { get; set; } = null!;
        public ICollection<LocationReviewReport> Reports { get; set; } = new List<LocationReviewReport>();
    }
}
