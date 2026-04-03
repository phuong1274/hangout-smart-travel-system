namespace HSTS.Application.LocationClosures
{
    public record LocationClosureDto(
        int Id,
        int LocationId,
        DateTime StartDate,
        DateTime EndDate,
        string? Reason,
        bool IsActive,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}
