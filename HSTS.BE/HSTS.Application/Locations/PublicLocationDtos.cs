namespace HSTS.Application.Locations;

public record PublicDestinationDto(
    int Id,
    string Name,
    int LocationCount);

public record PublicLocationCardDto(
    int Id,
    string Name,
    string Destination,
    string District,
    decimal? Score,
    int ReviewCount,
    string? ImageUrl);

public record PublicLocationDetailDto(
    int Id,
    string Name,
    string Destination,
    string District,
    string Address,
    string? Description,
    decimal? AverageRating,
    int ReviewCount,
    IReadOnlyList<string> ImageUrls);

public record PublicLocationPagedResponse(IReadOnlyList<PublicLocationCardDto> Items, int TotalCount);
