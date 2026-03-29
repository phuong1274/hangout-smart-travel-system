namespace HSTS.Application.Itineraries
{
    public record SmartItineraryDto(
        decimal TotalBudget,
        BudgetSummaryDto BudgetSummary,
        IList<DailyItineraryDto> Days,
        IList<InterCityTransportOptionDto> InterCityTransportOptions);

    public record BudgetSummaryDto(
        decimal ContingencyFund,
        decimal UsableBudget,
        decimal TransportBudget,
        decimal AccommodationBudget,
        decimal ActivityBudget,
        decimal EstimatedActivitySpend,
        decimal RemainingBudget);

    public record DailyItineraryDto(
        int DayNumber,
        DateOnly Date,
        int DestinationProvinceId,
        string DestinationProvinceName,
        decimal WeightedDailyBudget,
        decimal Floor,
        decimal Limit,
        decimal EstimatedSpend,
        decimal RolloverToNextDay,
        IList<string> Notes,
        IList<ActivityPlanDto> Activities,
        IList<TravelLegDto> TravelLegs,
        AccommodationRecommendationDto? Accommodation,
        InterCityTransportOptionDto? TransferFromPreviousDestination);

    public record ActivityPlanDto(
        int LocationId,
        string LocationName,
        TimeOnly StartTime,
        TimeOnly EndTime,
        decimal TicketCost,
        decimal ExtraSpendingCost,
        decimal TravelCost,
        decimal TotalCost,
        double CompositeScore,
        IList<string> Tags);

    public record TravelLegDto(
        int? FromLocationId,
        string FromLocationName,
        int ToLocationId,
        string ToLocationName,
        TimeOnly DepartureTime,
        TimeOnly ArrivalTime,
        double DistanceKm,
        string SelectedMethod,
        int SelectedTravelTimeMinutes,
        decimal SelectedTotalCost,
        IList<LocalTransportOptionDto> TransportOptions);

    public record LocalTransportOptionDto(
        string Method,
        decimal TotalCost,
        int TravelTimeMinutes,
        int VehiclesNeeded,
        string Pros,
        string Cons,
        bool Recommended);

    public record AccommodationRecommendationDto(
        int LocationId,
        string LocationName,
        double Score,
        RoomOptionDto? RecommendedRoom,
        IList<RoomOptionDto> Options,
        IList<AlternativeAccommodationDto> Alternatives);

    public record AlternativeAccommodationDto(
        int LocationId,
        string LocationName,
        double Score,
        RoomOptionDto? RecommendedRoom,
        IList<RoomOptionDto> Options);

    public record RoomOptionDto(
        string Name,
        int MaxOccupancy,
        int RoomsNeeded,
        decimal PricePerNight,
        decimal TotalCost,
        int AvailableRooms,
        string? Amenities,
        bool Recommended,
        IList<string> Pros,
        IList<string> Cons);

    public record InterCityTransportOptionDto(
        int FromProvinceId,
        string FromProvinceName,
        int ToProvinceId,
        string ToProvinceName,
        string Method,
        string Description,
        string? DepartureHub,
        string? ArrivalHub,
        decimal TotalCost,
        int TravelTimeMinutes,
        string Pros,
        string Cons,
        bool Recommended,
        double DistanceKm);
}