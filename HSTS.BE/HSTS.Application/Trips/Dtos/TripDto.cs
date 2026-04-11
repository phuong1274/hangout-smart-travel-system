namespace HSTS.Application.Trips.Dtos
{
    public record TripDto(
        int Id,
        string TripName,
        string? Description,
        DateTime StartDate,
        DateTime EndDate,
        int GroupSize,
        string CurrencyCode,
        int Status,
        List<TripDayDto> Days,
        TripSummaryDto? BudgetSummary
    );

    public record TripDayDto(
        int Id,
        int DayNumber,
        DateTime Date,
        string DayTitle,
        string? WeatherSummary,
        decimal EstimatedCost,
        List<TripActivityDto> Activities
    );

    public record TripActivityDto(
        int Id,
        int Type,
        string Title,
        TimeOnly? StartTime,
        TimeOnly? EndTime,
        int? LocationId,
        int? CustomLocationId,
        TripTransportDto? Transport,
        TripActivityBudgetDto? Budget
    );

    public record TripTransportDto(
        int Id,
        int? TransportModeId,
        decimal DistanceKm,
        int TravelTimeMinutes,
        int? FromLocationId,
        int? ToLocationId,
        int? FromTransitHubId,
        int? ToTransitHubId,
        int? CustomFromTransitHubId,
        int? CustomToTransitHubId
    );

    public record TripActivityBudgetDto(
        int Id,
        decimal EstimateCost,
        string? Title,
        string? Description
    );

    public record TripSummaryDto(
        int Id,
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
