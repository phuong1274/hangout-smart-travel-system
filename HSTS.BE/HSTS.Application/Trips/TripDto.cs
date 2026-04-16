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
}
