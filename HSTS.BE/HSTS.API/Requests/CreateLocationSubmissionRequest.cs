namespace HSTS.API.Requests
{
    public record CreateLocationSubmissionRequest(
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
        int? LocationTypeId,
        List<string>? MediaLinks,
        List<SocialLinkRequest>? SocialLinks,
        List<int>? AmenityIds,
        List<int>? TagIds
    );

    public record SocialLinkRequest(
        string Platform,
        string Url
    );

    public record ReviewLocationSubmissionRequest(
        Domain.Entities.SubmissionStatus Status,
        string? RejectionReason
    );
}
