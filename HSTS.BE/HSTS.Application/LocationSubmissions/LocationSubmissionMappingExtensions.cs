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
                submission.DestinationId,
                submission.Destination?.Name,
                submission.LocationTypeId,
                submission.LocationType?.Name,
                mediaLinks,
                socialLinks,
                amenityIds,
                tagIds,
                submission.Status,
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
