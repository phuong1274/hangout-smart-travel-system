namespace HSTS.Application.Dashboard;

public record AdminDashboardSummaryDto(
    int TotalDestinations,
    int TotalProvinces,
    int TotalLocations,
    int TotalReviews,
    int TotalItinerariesCreated,
    int TotalItinerariesCompleted);

public record DashboardTrendPointDto(string Label, int Value);

public record AdminDashboardTrendDto(
    IReadOnlyList<DashboardTrendPointDto> LocationGrowth,
    IReadOnlyList<DashboardTrendPointDto> ReviewGrowth,
    IReadOnlyList<DashboardTrendPointDto> ItineraryGrowth);
