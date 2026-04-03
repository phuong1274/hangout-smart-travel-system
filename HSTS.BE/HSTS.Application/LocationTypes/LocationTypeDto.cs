namespace HSTS.Application.LocationTypes
{
    public record LocationTypeDto(
        int Id,
        string Name,
        string? Description,
        DateTime CreatedAt = default,
        DateTime? UpdatedAt = null
    );
}
