namespace HSTS.Application.Countries
{
    public record CountryDto(
        string Id,
        string Name,
        string? Code,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}
