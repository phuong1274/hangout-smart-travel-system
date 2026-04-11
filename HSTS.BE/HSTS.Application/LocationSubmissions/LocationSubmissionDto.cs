namespace HSTS.Application.LocationSubmissions
{
    public record LocationSubmissionDto(
        int Id,
        int UserId,
        string Name,
        string? Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        string? Telephone,
        string? Email,
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        decimal? Score,
        int? RecommendedDurationMinutes,
        string? SourceUrl,
        int? DistrictId,
        string? DistrictName,
        int? LocationTypeId,
        string? LocationTypeName,
        List<string>? MediaLinks,
        List<LocationSubmissionSocialLinkDto>? SocialLinks,
        List<int>? AmenityIds,
        List<LocationSubmissionOpeningHourDto>? OpeningHours,
        List<LocationSubmissionSeasonDto>? Seasons,
        Domain.Entities.SubmissionStatus Status,
        Domain.Entities.SubmissionType SubmissionType,
        int? ExistingLocationId,
        Locations.LocationDto? ExistingLocation = null,
        string? RejectionReason = null,
        DateTime? ReviewedAt = null,
        string? ReviewedBy = null,
        int? CreatedLocationId = null,
        DateTime CreatedAt = default,
        DateTime? UpdatedAt = null,
        // Optional fields with defaults must come last
        List<LocationSubmissionTagDto>? Tags = null,
        List<int>? TagIds = null
    );

    public record LocationSubmissionTagDto(
        int Id,
        string Name
    );

    public record LocationSubmissionSocialLinkDto(
        int Platform,
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
