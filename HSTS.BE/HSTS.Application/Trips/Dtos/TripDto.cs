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
        string Type,
        string? Title,
        TimeOnly? StartTime,
        TimeOnly? EndTime,
        int? LocationId,
        int Status,
        TripActivityBudgetDto? Budget,
        TripTransportDto? Transport
    );

    public record TripTransportDto(
        int Id,
        int? TransportModeId,
        string? TransportModeName,
        decimal DistanceKm,
        int TravelTimeMinutes,
        string? YourLocationName,
        int? FromLocationId,
        string? FromLocationName,
        int? ToLocationId,
        string? ToLocationName,
        int? FromTransitHubId,
        string? FromTransitHubName,
        int? ToTransitHubId,
        string? ToTransitHubName,
        int? CustomFromTransitHubId,
        string? CustomFromTransitHubName,
        int? CustomToTransitHubId,
        string? CustomToTransitHubName
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

    public record TripMemberDto(
        int Id,
        int TripId,
        int? UserId,
        string Name,
        string Role,
        DateTime CreatedAt
    );

    public record TripMemberDetailDto(
        int Id,
        int TripId,
        int UserId,
        string FullName,
        string? AvatarUrl,
        string Role,
        int RoleValue,
        DateTime JoinedDate,
        string? PhoneNumber
    );

}
