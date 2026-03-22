using HSTS.Domain.Entities;
using System.Text.Json;

namespace HSTS.Application.LocationSubmissions
{
    public static class LocationSubmissionMappingExtensions
    {
        public static LocationSubmissionDto ToDto(this LocationSubmission submission)
        {
            List<string>? mediaLinks = null;
            List<LocationSubmissionSocialLinkDto>? socialLinks = null;
            List<int>? amenityIds = null;
            List<int>? tagIds = null;
            List<LocationSubmissionOpeningHourDto>? openingHours = null;
            List<LocationSubmissionSeasonDto>? seasons = null;

            if (!string.IsNullOrEmpty(submission.MediaLinksJson))
            {
                mediaLinks = JsonSerializer.Deserialize<List<string>>(submission.MediaLinksJson);
            }

            if (!string.IsNullOrEmpty(submission.SocialLinksJson))
            {
                socialLinks = JsonSerializer.Deserialize<List<LocationSubmissionSocialLinkDto>>(submission.SocialLinksJson);
            }

            if (!string.IsNullOrEmpty(submission.AmenityIdsJson))
            {
                amenityIds = JsonSerializer.Deserialize<List<int>>(submission.AmenityIdsJson);
            }

            if (!string.IsNullOrEmpty(submission.TagIdsJson))
            {
                tagIds = JsonSerializer.Deserialize<List<int>>(submission.TagIdsJson);
            }

            // Deserialize opening hours
            if (!string.IsNullOrEmpty(submission.OpeningHoursJson))
            {
                var ohList = JsonSerializer.Deserialize<List<JsonElement>>(submission.OpeningHoursJson);
                if (ohList != null)
                {
                    openingHours = ohList.Select(oh => new LocationSubmissionOpeningHourDto(
                        oh.TryGetProperty("id", out var idProp) ? idProp.GetInt32() : 0,
                        oh.TryGetProperty("dayOfWeek", out var dowProp) ? dowProp.GetInt32() : 0,
                        oh.TryGetProperty("dayOfWeek", out var dowNameProp) ? ((DayOfWeek)dowNameProp.GetInt32()).ToString() : "Unknown",
                        oh.TryGetProperty("openTime", out var otProp) && otProp.ValueKind != JsonValueKind.Null 
                            ? TimeSpan.Parse(otProp.GetString() ?? "08:00") 
                            : TimeSpan.FromHours(8),
                        oh.TryGetProperty("closeTime", out var ctProp) && ctProp.ValueKind != JsonValueKind.Null 
                            ? TimeSpan.Parse(ctProp.GetString() ?? "17:00") 
                            : TimeSpan.FromHours(17),
                        oh.TryGetProperty("note", out var noteProp) ? noteProp.GetString() : null
                    )).ToList();
                }
            }

            // Deserialize seasons
            if (!string.IsNullOrEmpty(submission.SeasonsJson))
            {
                var seasonsList = JsonSerializer.Deserialize<List<JsonElement>>(submission.SeasonsJson);
                if (seasonsList != null)
                {
                    seasons = seasonsList.Select(s => new LocationSubmissionSeasonDto(
                        s.TryGetProperty("id", out var idProp) ? idProp.GetInt32() : 0,
                        s.TryGetProperty("description", out var descProp) ? descProp.GetString() : "",
                        s.TryGetProperty("months", out var monthsProp) ? monthsProp.ToString() : ""
                    )).ToList();
                }
            }

            // Deserialize proposed changes for edit submissions
            Dictionary<string, object>? proposedChanges = null;
            if (!string.IsNullOrEmpty(submission.ProposedChangesJson))
            {
                proposedChanges = JsonSerializer.Deserialize<Dictionary<string, object>>(submission.ProposedChangesJson);
            }

            return new LocationSubmissionDto(
                submission.Id,
                submission.UserId,
                submission.Name,
                submission.Description,
                submission.Latitude,
                submission.Longitude,
                submission.Address,
                submission.Telephone,
                submission.Email,
                submission.PriceMinUsd,
                submission.PriceMaxUsd,
                submission.Score,
                submission.DestinationId,
                submission.Destination?.Name,
                submission.LocationTypeId,
                submission.LocationType?.Name,
                mediaLinks,
                socialLinks,
                amenityIds,
                tagIds,
                openingHours,
                seasons,
                submission.Status,
                submission.SubmissionType,
                submission.ExistingLocationId,
                submission.RejectionReason,
                submission.ReviewedAt,
                submission.ReviewedBy,
                submission.CreatedLocationId,
                submission.CreatedAt,
                submission.UpdatedAt
            );
        }
    }
}
