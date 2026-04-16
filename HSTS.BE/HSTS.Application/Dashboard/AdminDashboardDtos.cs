namespace HSTS.Application.Dashboard;

public record AdminDashboardSummaryDto(
    int TotalUsers,
    int ActiveAccounts,
    int TotalTrips,
    int CompletedTrips,
    int ActiveLocations,
    int CoveredDestinations,
    int VisibleReviews,
    int PendingLocationSubmissions,
    int PendingReviewReports,
    int HiddenReviews);

public record DashboardTrendPointDto(string Label, int Value);

public record AdminDashboardTrendDto(
    IReadOnlyList<DashboardTrendPointDto> LocationGrowth,
    IReadOnlyList<DashboardTrendPointDto> ReviewGrowth,
    IReadOnlyList<DashboardTrendPointDto> TripGrowth);

public record AdminDashboardInsightsDto(
    int TripsCreatedThisMonth,
    int TripsCompletedThisMonth,
    int LocationsAddedThisMonth,
    int ApprovedSubmissionsThisMonth,
    int RejectedSubmissionsThisMonth,
    decimal AvgReviewsPerActiveLocation,
    int LocationsWithoutReviews,
    decimal ModerationResolutionRate);

public record AdminDashboardQueueSubmissionDto(
    int Id,
    string Name,
    int SubmissionType,
    DateTime CreatedAt,
    int Status);

public record AdminDashboardQueueReviewDto(
    int ReviewId,
    string LocationName,
    string AuthorEmail,
    int ReportCount,
    string ReviewStatus,
    DateTime UpdatedAt);

public record AdminDashboardQueuesDto(
    IReadOnlyList<AdminDashboardQueueSubmissionDto> PendingSubmissions,
    IReadOnlyList<AdminDashboardQueueReviewDto> PendingReviewReports);