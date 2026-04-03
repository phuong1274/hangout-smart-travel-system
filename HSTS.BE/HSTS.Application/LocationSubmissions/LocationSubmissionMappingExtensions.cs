using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using System.Text.Json;

namespace HSTS.Application.LocationSubmissions
{
    public static class LocationSubmissionMappingExtensions
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public static LocationSubmissionDto ToDto(this LocationSubmission submission)
        {
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
                submission.DistrictId,
                submission.District?.Name,
                submission.LocationTypeId,
                submission.LocationType?.Name,
                DeserializeJson<List<string>>(submission.MediaLinksJson),
                DeserializeSocialLinks(submission.SocialLinksJson),
                DeserializeJson<List<int>>(submission.AmenityIdsJson),
                DeserializeJson<List<int>>(submission.TagIdsJson),
                DeserializeOpeningHours(submission.OpeningHoursJson),
                DeserializeSeasons(submission.SeasonsJson),
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

        private static List<LocationSubmissionSocialLinkDto> DeserializeSocialLinks(string? json)
        {
            var socialLinks = DeserializeJson<List<SocialLinkJson>>(json);
            if (socialLinks is null || socialLinks.Count == 0)
                return new List<LocationSubmissionSocialLinkDto>();

            return socialLinks.Select(sl => new LocationSubmissionSocialLinkDto(
                ParseSocialPlatform(sl.Platform),
                sl.Url ?? string.Empty
            )).ToList();
        }

        private static int ParseSocialPlatform(object? platformValue)
        {
            if (platformValue is null)
                return (int)SocialPlatform.Other;

            // Handle integer directly (e.g., 12)
            if (platformValue is int platformInt)
                return platformInt;

            // Handle JsonNumber (stored as object)
            if (platformValue is JsonElement jsonElement)
            {
                if (jsonElement.ValueKind == JsonValueKind.Number)
                    return jsonElement.GetInt32();
                if (jsonElement.ValueKind == JsonValueKind.String)
                    platformValue = jsonElement.GetString();
            }

            // Handle string (either "12" or "Zalo")
            if (platformValue is string platformStr)
            {
                if (string.IsNullOrWhiteSpace(platformStr))
                    return (int)SocialPlatform.Other;

                // Try parsing as integer first
                if (int.TryParse(platformStr, out var parsedInt))
                    return parsedInt;

                // Try parsing as enum name (case-insensitive)
                if (Enum.TryParse<SocialPlatform>(platformStr, ignoreCase: true, out var platformEnum))
                    return (int)platformEnum;
            }

            // Fallback to Other
            return (int)SocialPlatform.Other;
        }

        private static List<LocationSubmissionOpeningHourDto>? DeserializeOpeningHours(string? json)
        {
            var openingHours = DeserializeJson<List<OpeningHourJson>>(json);
            if (openingHours is null || openingHours.Count == 0)
                return null;

            return openingHours.Select(oh => new LocationSubmissionOpeningHourDto(
                oh.Id,
                oh.DayOfWeek,
                ((DayOfWeek)oh.DayOfWeek).ToString(),
                ParseTimeSpan(oh.OpenTime, TimeSpan.FromHours(8)),
                ParseTimeSpan(oh.CloseTime, TimeSpan.FromHours(17)),
                oh.Note
            )).ToList();
        }

        private static TimeSpan ParseTimeSpan(string? timeString, TimeSpan defaultValue)
        {
            if (string.IsNullOrWhiteSpace(timeString))
                return defaultValue;

            return TimeSpan.TryParse(timeString, out var result) ? result : defaultValue;
        }

        private static List<LocationSubmissionSeasonDto>? DeserializeSeasons(string? json)
        {
            var seasons = DeserializeJson<List<SeasonJson>>(json);
            if (seasons is null || seasons.Count == 0)
                return null;

            return seasons.Select(s => new LocationSubmissionSeasonDto(
                s.Id,
                s.Description ?? string.Empty,
                s.Months ?? string.Empty
            )).ToList();
        }

        private static T? DeserializeJson<T>(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return default;

            try
            {
                return JsonSerializer.Deserialize<T>(json, JsonOptions);
            }
            catch (JsonException ex)
            {
                // Log error for debugging (in production, use proper logging framework)
                System.Diagnostics.Debug.WriteLine(
                    $"JSON deserialization failed for type {typeof(T).Name}: {ex.Message}");
                return default;
            }
        }
    }

    // Internal DTOs for JSON deserialization
    internal sealed class SocialLinkJson
    {
        public object? Platform { get; set; }
        public string? Url { get; set; }
    }

    internal sealed class OpeningHourJson
    {
        public int Id { get; set; }
        public int DayOfWeek { get; set; }
        public string? OpenTime { get; set; }
        public string? CloseTime { get; set; }
        public string? Note { get; set; }
    }

    internal sealed class SeasonJson
    {
        public int Id { get; set; }
        public string? Description { get; set; }
        public string? Months { get; set; }
    }
}
