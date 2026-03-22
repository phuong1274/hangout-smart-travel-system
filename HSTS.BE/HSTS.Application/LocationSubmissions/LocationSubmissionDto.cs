namespace HSTS.Application.LocationSubmissions
{
    public record LocationSubmissionDto(
        int Id,
        int UserId,
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
        string? DestinationName,
        int? LocationTypeId,
        string? LocationTypeName,
        List<string>? MediaLinks,
        List<LocationSubmissionSocialLinkDto>? SocialLinks,
        List<int>? AmenityIds,
        List<int>? TagIds,
        List<LocationSubmissionOpeningHourDto>? OpeningHours,
        List<LocationSubmissionSeasonDto>? Seasons,
        Domain.Entities.SubmissionStatus Status,
        Domain.Entities.SubmissionType SubmissionType,
        int? ExistingLocationId,
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

    public record LocationSubmissionOpeningHourDto(
        int Id,
        int DayOfWeek,
        string DayName,
        TimeSpan? OpenTime,
        TimeSpan? CloseTime,
        string? Note
    );

    public record LocationSubmissionSeasonDto(
        int Id,
        string Description,
        string Months
    );
}
