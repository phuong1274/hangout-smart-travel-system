namespace HSTS.Application.LocationSubmissions
{
    public record LocationSubmissionDto(
        int Id,
        string UserId,
        string Name,
        string? Description,
        double Latitude,
        double Longitude,
        string Address,
        string? Telephone,
        string? Email,
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        int? DestinationId,
        string? DestinationName,
        int? LocationTypeId,
        string? LocationTypeName,
        List<string>? MediaLinks,
        List<LocationSubmissionSocialLinkDto>? SocialLinks,
        List<int>? AmenityIds,
        List<int>? TagIds,
        Domain.Entities.SubmissionStatus Status,
        string? RejectionReason,
        DateTime? ReviewedAt,
        string? ReviewedBy,
        int? CreatedLocationId,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );

    public record LocationSubmissionSocialLinkDto(
        string Platform,
        string Url
    );
}
