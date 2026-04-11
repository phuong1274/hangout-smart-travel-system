using HSTS.Domain.Enums;

namespace HSTS.Application.Trips.Dtos
{
    public record TripDetailDto(
        int Id,
        string TripName,
        string? Description,
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
}
