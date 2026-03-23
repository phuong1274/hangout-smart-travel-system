namespace HSTS.Application.States
{
    public record StateDto(
        int Id,
        string Name,
        string? EnglishName,
        string? Code,
        string CountryId,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}
