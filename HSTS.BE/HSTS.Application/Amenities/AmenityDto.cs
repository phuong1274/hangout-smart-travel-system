namespace HSTS.Application.Amenities
{
    public record AmenityDto(
        int Id,
        string Name,
        string? Description,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}
