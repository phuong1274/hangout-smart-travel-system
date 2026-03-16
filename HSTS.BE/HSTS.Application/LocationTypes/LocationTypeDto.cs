namespace HSTS.Application.LocationTypes
{
    public record LocationTypeDto(
        int Id,
        string Name,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}
