using HSTS.Domain.Enums;

namespace HSTS.Application.Expenses
{
    public record TripMemberDto(
        int Id,
        int TripId,
        int? UserId,
        string Name,
        TripMemberRole Role,
        DateTime CreatedAt
    );
}
