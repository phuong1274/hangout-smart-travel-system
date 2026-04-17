using HSTS.Domain.Enums;

namespace HSTS.Application.Trips.Dtos
{
    // Input từ FE - map từ GeneratedItineraryDto mà FE đã nhận
    public record SaveTripRequest(
        string TripName,
        string? Description,
        DateTime StartDate,
        DateTime EndDate,
        int GroupSize,
        string CurrencyCode,
        List<SaveTripDayRequest> Days,
        SaveTripSummaryRequest BudgetSummary
    );

    public record SaveTripDayRequest(
        int DayNumber,
        DateTime Date,
        string DayTitle,
        string? WeatherSummary,
        decimal EstimatedCost,
        List<SaveTripActivityRequest> Activities
    );

    public record SaveTripActivityRequest(
        ActivityType Type,
        string Title,
        TimeOnly? StartTime,
        TimeOnly? EndTime,
        int? LocationId,           // FK đến Location (có sẵn trong DB)
        int? CustomLocationId,     // FK đến CustomLocation (người dùng tự thêm)
        SaveCustomLocationRequest? CustomLocation, // HOẶC tạo mới CustomLocation
        SaveTripTransportRequest? Transport,
        SaveTripActivityBudgetRequest? Budget
    );

    public record SaveCustomLocationRequest(
        string Name,
        double Latitude,
        double Longitude,
        string? Address,
        string? Description,
        int LocationTypeId
    );

    public record SaveTripTransportRequest(
        int? TransportModeId,
        decimal DistanceKm,
        int TravelTimeMinutes,
        int? FromLocationId,
        int? ToLocationId,
        int? FromTransitHubId,
        int? ToTransitHubId,
        int? CustomFromTransitHubId,
        int? CustomToTransitHubId,
        SaveCustomTransitHubRequest? CustomFromTransitHub, // HOẶC tạo mới
        SaveCustomTransitHubRequest? CustomToTransitHub    // HOẶC tạo mới
    );

    public record SaveCustomTransitHubRequest(
        string Name,
        double Latitude,
        double Longitude,
        string? Address
    );

    public record SaveTripActivityBudgetRequest(
        decimal EstimateCost,
        string? Title,
        string? Description
    );

    public record SaveTripSummaryRequest(
        decimal TotalBudget,
        decimal UsableBudget,
        decimal EstimatedAccommodationCost,
        decimal EstimatedTransportCost,
        decimal EstimatedActivityCost,
        decimal EstimatedMealCost,
        decimal EstimatedTotalCost,
        decimal RemainingBudget,
        decimal? ContingencyFund
    );
}
