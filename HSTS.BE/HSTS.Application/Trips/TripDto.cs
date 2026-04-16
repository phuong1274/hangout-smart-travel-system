using HSTS.Domain.Entities;
using HSTS.Domain.Enums;

namespace HSTS.Application.Trips
{
    public record TripDto(
        int Id,
        string TripName,
        string? Description,
        DateTime StartDate,
        DateTime EndDate,
        string? StartingLocation,
        TripStatus Status,
        string Currency,
        DateTime CreatedAt
    );

    public record TripDetailDto(
        int Id,
        string TripName,
        string? Description,
        int ProfileId,
        DateTime StartDate,
        DateTime EndDate,
        string? StartingLocation,
        TripStatus Status,
        string Currency,
        DateTime CreatedAt,
        TripSummaryDto? TripSummary,
        List<TripDayDto> TripDays,
        List<TripMemberDto> TripMembers
    );

    public record TripDayDto(
        int Id,
        int DayNumber,
        DateTime Date,
        string DayTitle,
        string? WeatherSummary,
        decimal EstimateCost,
        List<TripActivityDto> Activities
    );

    public record TripActivityDto(
        int Id,
        int TripDayId,
        string Type,
        string Title,
        TimeOnly? StartTime,
        TimeOnly? EndTime,
        int? LocationId,
        TripActivityBudgetDto? Budget
    );

    public record TripActivityBudgetDto(
        int Id,
        decimal EstimateCost,
        string? Title,
        string? Description,
        decimal? ActualExpense
    );

    public record TripSummaryDto(
        int Id,
        decimal TotalBudget,
        decimal UsableBudget,
        decimal EstimatedAccommodationCost,
        decimal EstimatedTransportCost,
        decimal EstimatedActivityCost,
        decimal EstimatedTotalCost,
        decimal RemainingBudget,
        decimal? ContingencyFund
    );

    public record TripMemberDto(
        int Id,
        int TripId,
        int? UserId,
        string Name,
        string Role,
        DateTime CreatedAt
    );
}
