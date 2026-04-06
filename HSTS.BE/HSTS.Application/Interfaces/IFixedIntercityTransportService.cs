namespace HSTS.Application.Interfaces
{
    public static class TrainSeatTypes
    {
        public const string HardSeat = "hard_seat";
        public const string SoftSeat = "soft_seat";
        public const string Sleeper4 = "sleeper_4";
        public const string Sleeper6 = "sleeper_6";
    }

    public static class FlightCabinTypes
    {
        public const string Economy = "economy";
        public const string PremiumEconomy = "premium_economy";
        public const string Business = "business";
    }

    public record FixedIntercitySearchRequest(
        int? FromId,
        double? FromLatitude,
        double? FromLongitude,
        int? ToId,
        double? ToLatitude,
        double? ToLongitude,
        DateOnly DepartDate,
        DateOnly? ReturnDate,
        int Page,
        int PageSize);

    public record TrainRouteSearchRequest(
        string From,
        string To,
        DateOnly DepartDate,
        DateOnly? ReturnDate,
        string? SeatType,
        int Adults,
        int Children,
        int Seniors,
        int Students,
        int UnionMembers,
        int Page,
        int PageSize);

    public record TrainMonthlyCalendarRequest(
        string From,
        string To,
        string Month,
        string? SeatType,
        int Adults,
        int Children,
        int Seniors,
        int Students,
        int UnionMembers);

    public record FlightRouteSearchRequest(
        string From,
        string To,
        DateOnly DepartDate,
        DateOnly? ReturnDate,
        string? Cabin,
        int Adults,
        int Children,
        int Infants,
        int Page,
        int PageSize);

    public record FlightMonthlyCalendarRequest(
        string From,
        string To,
        string Month,
        string? Cabin,
        int Adults,
        int Children,
        int Infants);

    public record FixedIntercityOption(
        string Method,
        int EstimatedTravelMinutes,
        decimal EstimatedTotalCost,
        string Note,
        int? FromHubId = null,
        string? FromHubName = null,
        int? ToHubId = null,
        string? ToHubName = null);

    public record FixedIntercitySearchResult(
        bool IsSuccess,
        string Source,
        FixedIntercityOption? RecommendedOption,
        string? RawResponse,
        string? ErrorMessage);

    public record TrainMonthlyCalendarResult(
        bool IsSuccess,
        string Source,
        string? RawResponse,
        string? ErrorMessage);

    public record FlightMonthlyCalendarResult(
        bool IsSuccess,
        string Source,
        string? RawResponse,
        string? ErrorMessage);

    public interface IFixedIntercityTransportService
    {
        Task<FixedIntercitySearchResult> SearchBusAsync(
            FixedIntercitySearchRequest request,
            CancellationToken cancellationToken = default);

        Task<FixedIntercitySearchResult> SearchTrainAsync(
            TrainRouteSearchRequest request,
            CancellationToken cancellationToken = default);

        Task<TrainMonthlyCalendarResult> GetTrainMonthlyCalendarAsync(
            TrainMonthlyCalendarRequest request,
            CancellationToken cancellationToken = default);

        Task<FixedIntercitySearchResult> SearchFlightAsync(
            FlightRouteSearchRequest request,
            CancellationToken cancellationToken = default);

        Task<FlightMonthlyCalendarResult> GetFlightMonthlyCalendarAsync(
            FlightMonthlyCalendarRequest request,
            CancellationToken cancellationToken = default);
    }
}
