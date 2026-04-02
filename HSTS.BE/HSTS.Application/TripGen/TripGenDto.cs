namespace HSTS.Application.TripGen
{
    public record TripGenResponse(
        List<DayPlan> Days,
        TripSummary TripSummary
    );

    public record DayPlan(
        string Day,
        string LocationId,
        DailyBudgetStatus DailyBudgetStatus,
        List<TimelineEvent> Timeline
    );

    public record DailyBudgetStatus(
        decimal Spent,
        decimal Limit,
        decimal Floor,
        decimal Weight
    );

    public record TimelineEvent(
        string Type,
        string Time,
        string TimeBlock,
        string Description,
        string? LocationId = null,
        decimal? Cost = null,
        decimal? TicketCost = null,
        decimal? ExtraSpendingCost = null,
        bool? GroupDiscountApplied = null,
        List<TransportOption>? TransportOptions = null,
        int? SelectedTransportIndex = null,
        int? SelectedAccommodationIndex = null,
        decimal? LuggageStorageCost = null,
        string? Action = null,
        string? CheckInTime = null,
        string? CheckOutTime = null,
        List<AccommodationOption>? AccommodationOptions = null,
        List<AccommodationOption>? AlternativeAccommodations = null
    );

    public record TransportOption(
        string MethodId,
        string Description,
        decimal TotalCost,
        int TravelTimeMinutes,
        int VehiclesNeeded,
        bool Recommended,
        decimal CostPerPerson,
        int GroupSize,
        string DepartureHub,
        string ArrivalHub,
        string? Pros = null,
        string? Cons = null
    );

    public record AccommodationOption(
        string LocationId,
        string Description,
        decimal PricePerNight,
        int MaxOccupancy,
        int RoomsNeeded,
        decimal TotalCost,
        List<string> Amenities,
        bool Recommended,
        string Pros,
        string Cons,
        decimal? Distance = null
    );

    public record TripSummary(
        decimal TotalEstimatedCost,
        CostBreakdown CostBreakdown,
        decimal RemainingContingencyFund,
        decimal ContingencyFundPercentage,
        bool IsBudgetInsufficient,
        string? BudgetWarning,
        decimal MinimumRecommendedBudget
    );

    public record CostBreakdown(
        decimal AccommodationTotal,
        decimal TransportTotal,
        decimal FoodTotal,
        decimal ActivityTotal
    );
}
