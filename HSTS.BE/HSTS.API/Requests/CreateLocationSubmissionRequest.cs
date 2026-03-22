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
        decimal? Score,
        int? DestinationId,
        int? LocationTypeId,
        List<string>? MediaLinks,
        List<SocialLinkRequest>? SocialLinks,
        List<int>? AmenityIds,
        List<int>? TagIds,
        List<SubmissionOpeningHourRequest>? OpeningHours,
        List<SubmissionSeasonRequest>? Seasons,
        Domain.Entities.SubmissionType SubmissionType = Domain.Entities.SubmissionType.NewLocation,
        int? ExistingLocationId = null,
        Dictionary<string, object>? ProposedChanges = null
    );

    public record SocialLinkRequest(
        string Platform,
        string Url
    );

    public record SubmissionOpeningHourRequest(
        int Id,
        int DayOfWeek,
        string? OpenTime,
        string? CloseTime,
        string? Note
    );

    public record SubmissionSeasonRequest(
        int Id,
        string Description,
        string Months
    );

    public record ReviewLocationSubmissionRequest(
        Domain.Entities.SubmissionStatus Status,
        string? RejectionReason
    );
}
