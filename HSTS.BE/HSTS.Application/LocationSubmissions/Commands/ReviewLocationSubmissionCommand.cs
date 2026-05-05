using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Reflection;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Commands
{
    public record ReviewLocationSubmissionCommand(
        int Id,
        SubmissionStatus Status,
        string? RejectionReason,
        string ReviewedBy
    ) : IRequest<ErrorOr<LocationSubmissionDto>>;

    public class ReviewLocationSubmissionCommandHandler : IRequestHandler<ReviewLocationSubmissionCommand, ErrorOr<LocationSubmissionDto>>
    {
        private readonly IRepository.IRepository<LocationSubmission> _submissionRepository;
        private readonly IRepository.IRepository<Location> _locationRepository;
        private readonly IRepository.IRepository<Tag> _tagRepository;
        private readonly IRepository.IRepository<Amenity> _amenityRepository;

        public ReviewLocationSubmissionCommandHandler(
            IRepository.IRepository<LocationSubmission> submissionRepository,
            IRepository.IRepository<Location> locationRepository,
            IRepository.IRepository<Tag> tagRepository,
            IRepository.IRepository<Amenity> amenityRepository)
        {
            _submissionRepository = submissionRepository;
            _locationRepository = locationRepository;
            _tagRepository = tagRepository;
            _amenityRepository = amenityRepository;
        }

        public async Task<ErrorOr<LocationSubmissionDto>> Handle(ReviewLocationSubmissionCommand request, CancellationToken cancellationToken)
        {
            var submission = await _submissionRepository.Query()
                .Include(s => s.District)
                .Include(s => s.ExistingLocation)
                .FirstOrDefaultAsync(s => s.Id == request.Id && !s.IsDeleted, cancellationToken);

            if (submission == null)
            {
                return Error.NotFound("LocationSubmission.NotFound", $"Submission with ID {request.Id} was not found.");
            }

            if (submission.Status != Domain.Entities.SubmissionStatus.Pending)
            {
                return Error.Conflict("LocationSubmission.AlreadyReviewed",
                    "This submission has already been reviewed.");
            }

            if (request.Status == Domain.Entities.SubmissionStatus.Rejected && string.IsNullOrEmpty(request.RejectionReason))
            {
                return Error.Validation("LocationSubmission.RejectionReasonRequired",
                    "A rejection reason is required when rejecting a submission.");
            }

            // If approving, process based on submission type
            if (request.Status == Domain.Entities.SubmissionStatus.Approved)
            {
                if (submission.SubmissionType == Domain.Entities.SubmissionType.NewLocation && submission.CreatedLocationId == null)
                {
                    // Create NEW location
                    var createResult = await CreateNewLocation(submission, request.ReviewedBy, cancellationToken);
                    if (createResult.IsError)
                    {
                        return createResult.Errors;
                    }
                }
                else if (submission.SubmissionType == Domain.Entities.SubmissionType.EditExisting)
                {
                    // Update EXISTING location
                    var updateResult = await UpdateExistingLocation(submission, request.ReviewedBy, cancellationToken);
                    if (updateResult.IsError)
                    {
                        return updateResult.Errors;
                    }
                }
            }

            // Update submission status
            submission.Status = request.Status;
            submission.RejectionReason = request.RejectionReason;
            submission.ReviewedBy = request.ReviewedBy;
            submission.ReviewedAt = DateTime.UtcNow;
            submission.UpdatedBy = request.ReviewedBy;
            submission.UpdatedAt = DateTime.UtcNow;

            await _submissionRepository.UpdateAsync(submission, cancellationToken);

            // Resolve tags for the response
            var tagIds = submission.TagIdsJson != null 
                ? System.Text.Json.JsonSerializer.Deserialize<List<int>>(submission.TagIdsJson)
                : null;
            
            var tags = await LocationSubmissionMappingExtensions.ResolveTagsAsync(
                tagIds, 
                _tagRepository, 
                cancellationToken);

            return submission.ToDto(tags);
        }

        private async Task<ErrorOr<Success>> CreateNewLocation(LocationSubmission submission, string reviewedBy, CancellationToken cancellationToken)
        {
            // Validate required fields for location
            if (submission.DistrictId == null)
            {
                return Error.Validation("LocationSubmission.DistrictRequired", "District is required to create a location.");
            }

            if (submission.LocationTypeId == null)
            {
                return Error.Validation("LocationSubmission.LocationTypeRequired", "Location type is required to create a location.");
            }

            // Parse JSON fields
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

            // Create Location from submission
            var location = new Location
            {
                Name = submission.Name,
                Description = submission.Description,
                Latitude = submission.Latitude,
                Longitude = submission.Longitude,
                TicketPrice = submission.TicketPrice,
                MinimumAge = submission.MinimumAge,
                Address = submission.Address,
                Telephone = submission.Telephone,
                Email = submission.Email,
                DistrictId = submission.DistrictId.Value,
                LocationTypeId = submission.LocationTypeId.Value,
                PriceMinUsd = submission.PriceMinUsd,
                PriceMaxUsd = submission.PriceMaxUsd,
                RecommendedDurationMinutes = submission.RecommendedDurationMinutes,
                Score = submission.Score,
                SourceUrl = submission.SourceUrl,
                OwnerId = submission.UserId // Set the submission creator as the location owner (partner)
            };

            await _locationRepository.AddAsync(location, cancellationToken);

            // Add media links
            if (mediaLinks != null && mediaLinks.Count > 0)
            {
                foreach (var link in mediaLinks)
                {
                    location.LocationMedias.Add(new LocationMedia
                    {
                        LocationId = location.Id,
                        Link = link
                    });
                }
            }

            // Add social links
            if (socialLinks != null && socialLinks.Count > 0)
            {
                foreach (var socialLink in socialLinks)
                {
                    location.SocialLinks.Add(new LocationSocialLink
                    {
                        LocationId = location.Id,
                        Platform = (SocialPlatform)socialLink.Platform,
                        Url = socialLink.Url
                    });
                }
            }

            // Add amenities
            if (amenityIds != null && amenityIds.Count > 0)
            {
                var amenities = await _amenityRepository.Query()
                    .Where(a => amenityIds.Contains(a.Id) && !a.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var amenityId in amenityIds)
                {
                    var amenity = amenities.FirstOrDefault(a => a.Id == amenityId);
                    if (amenity != null)
                    {
                        location.LocationAmenities.Add(new LocationAmenity
                        {
                            LocationId = location.Id,
                            AmenityId = amenity.Id
                        });
                    }
                }
            }

            // Add tags
            if (tagIds != null && tagIds.Count > 0)
            {
                var tags = await _tagRepository.Query()
                    .Where(t => tagIds.Contains(t.Id) && !t.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var tagId in tagIds)
                {
                    var tag = tags.FirstOrDefault(t => t.Id == tagId);
                    if (tag != null)
                    {
                        location.LocationTags.Add(new LocationTag
                        {
                            LocationId = location.Id,
                            TagId = tag.Id
                        });
                    }
                }
            }

            // Parse and add opening hours
            if (!string.IsNullOrEmpty(submission.OpeningHoursJson))
            {
                var openingHoursData = JsonSerializer.Deserialize<List<JsonElement>>(submission.OpeningHoursJson);
                if (openingHoursData != null)
                {
                    foreach (var ohData in openingHoursData)
                    {
                        // Try both camelCase and PascalCase for dayOfWeek
                        int dayOfWeekValue = 1; // default Monday
                        if (ohData.TryGetProperty("dayOfWeek", out var dowProp) || ohData.TryGetProperty("DayOfWeek", out dowProp))
                        {
                            dayOfWeekValue = dowProp.GetInt32();
                        }
                        
                        // Convert from ISO 8601 (1=Monday, ..., 7=Sunday) to .NET DayOfWeek (0=Sunday, 1=Monday, ..., 6=Saturday)
                        var dayOfWeek = (DayOfWeek)(dayOfWeekValue == 7 ? 0 : dayOfWeekValue);

                        var openTimeStr = ohData.TryGetProperty("openTime", out var otProp) || ohData.TryGetProperty("OpenTime", out otProp)
                            ? otProp.GetString()
                            : "08:00";

                        var closeTimeStr = ohData.TryGetProperty("closeTime", out var ctProp) || ohData.TryGetProperty("CloseTime", out ctProp)
                            ? ctProp.GetString()
                            : "17:00";

                        var note = ohData.TryGetProperty("note", out var noteProp) || ohData.TryGetProperty("Note", out noteProp) ? noteProp.GetString() : null;

                        location.OpeningHours.Add(new LocationOpeningHour
                        {
                            LocationId = location.Id,
                            DayOfWeek = dayOfWeek,
                            OpenTime = !string.IsNullOrEmpty(openTimeStr) ? TimeSpan.Parse(openTimeStr) : TimeSpan.FromHours(8),
                            CloseTime = !string.IsNullOrEmpty(closeTimeStr) ? TimeSpan.Parse(closeTimeStr) : TimeSpan.FromHours(17),
                            Note = note
                        });
                    }
                }
            }

            // Parse and add seasons
            if (!string.IsNullOrEmpty(submission.SeasonsJson))
            {
                var seasonsData = JsonSerializer.Deserialize<List<JsonElement>>(submission.SeasonsJson);
                if (seasonsData != null)
                {
                    foreach (var seasonData in seasonsData)
                    {
                        // Handle both camelCase and PascalCase property names
                        var description = seasonData.TryGetProperty("description", out var descProp1)
                            ? descProp1.GetString()
                            : (seasonData.TryGetProperty("Description", out var descProp2)
                                ? descProp2.GetString()
                                : "");

                        string months = "";
                        if (seasonData.TryGetProperty("months", out var monthsProp1))
                        {
                            if (monthsProp1.ValueKind == JsonValueKind.String)
                            {
                                months = monthsProp1.GetString() ?? "";
                            }
                            else if (monthsProp1.ValueKind == JsonValueKind.Array)
                            {
                                var monthList = new List<string>();
                                foreach (var element in monthsProp1.EnumerateArray())
                                {
                                    monthList.Add(element.ToString());
                                }
                                months = string.Join(",", monthList);
                            }
                        }
                        else if (seasonData.TryGetProperty("Months", out var monthsProp2))
                        {
                            if (monthsProp2.ValueKind == JsonValueKind.String)
                            {
                                months = monthsProp2.GetString() ?? "";
                            }
                            else if (monthsProp2.ValueKind == JsonValueKind.Array)
                            {
                                var monthList = new List<string>();
                                foreach (var element in monthsProp2.EnumerateArray())
                                {
                                    monthList.Add(element.ToString());
                                }
                                months = string.Join(",", monthList);
                            }
                        }

                        location.Seasons.Add(new LocationSeason
                        {
                            LocationId = location.Id,
                            Description = description ?? "",
                            Months = months
                        });
                    }
                }
            }

            await _locationRepository.UpdateAsync(location, cancellationToken);

            // Update submission with created location ID
            submission.CreatedLocationId = location.Id;

            return Result.Success;
        }

        private async Task<ErrorOr<Success>> UpdateExistingLocation(LocationSubmission submission, string reviewedBy, CancellationToken cancellationToken)
        {
            if (submission.ExistingLocationId == null)
            {
                return Error.Validation("LocationSubmission.ExistingLocationIdRequired", "Existing location ID is required for edit submissions.");
            }

            // Fetch location with ALL related collections to ensure EF Core tracks them correctly.
            // This is crucial for the "Clear and Replace" logic to work (we need to load existing items to delete them).
            var location = await _locationRepository.Query()
                .Include(l => l.LocationAmenities)
                .Include(l => l.LocationTags)
                .Include(l => l.SocialLinks)
                .Include(l => l.LocationMedias)
                .Include(l => l.OpeningHours)
                .Include(l => l.Seasons)
                .FirstOrDefaultAsync(l => l.Id == submission.ExistingLocationId.Value && !l.IsDeleted, cancellationToken);

            if (location == null)
            {
                return Error.NotFound("Location.NotFound", "Existing location not found.");
            }

            // Check if we have proposed changes (old workflow) or full submission data (new unified form workflow)
            bool hasProposedChanges = !string.IsNullOrEmpty(submission.ProposedChangesJson);

            if (hasProposedChanges)
            {
                // OLD WORKFLOW: Apply proposed changes only
                var applyResult = await ApplyProposedChanges(location, submission, cancellationToken);
                if (applyResult.IsError)
                {
                    return applyResult.Errors;
                }
            }
            else
            {
                // NEW WORKFLOW: Update location with full submission data (unified form)
                await UpdateLocationWithSubmissionData(location, submission, cancellationToken);
            }

            location.UpdatedAt = DateTime.UtcNow;
            await _locationRepository.UpdateAsync(location, cancellationToken);

            return Result.Success;
        }

        private async Task<ErrorOr<Success>> ApplyProposedChanges(Location location, LocationSubmission submission, CancellationToken cancellationToken)
        {
            // Load related collections for update
            location.OpeningHours.Clear();
            location.Seasons.Clear();

            // Deserialize and apply proposed changes
            var changes = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(submission.ProposedChangesJson);

            if (changes == null)
            {
                return Error.Validation("LocationSubmission.NoProposedChanges", "No proposed changes found.");
            }

            foreach (var change in changes)
            {
                // Handle OpeningHours specially
                if (change.Key.Equals("OpeningHours", StringComparison.OrdinalIgnoreCase))
                {
                    var openingHoursData = JsonSerializer.Deserialize<List<JsonElement>>(change.Value.ToString());
                    if (openingHoursData != null)
                    {
                        foreach (var ohData in openingHoursData)
                        {
                            int dayOfWeekValue = 1;
                            if (ohData.TryGetProperty("dayOfWeek", out var dowProp) || ohData.TryGetProperty("DayOfWeek", out dowProp))
                            {
                                dayOfWeekValue = dowProp.GetInt32();
                            }

                            var dayOfWeek = (DayOfWeek)(dayOfWeekValue == 7 ? 0 : dayOfWeekValue);

                            var openTimeStr = ohData.TryGetProperty("openTime", out var otProp) || ohData.TryGetProperty("OpenTime", out otProp)
                                ? otProp.GetString()
                                : "08:00";

                            var closeTimeStr = ohData.TryGetProperty("closeTime", out var ctProp) || ohData.TryGetProperty("CloseTime", out ctProp)
                                ? ctProp.GetString()
                                : "17:00";

                            var note = ohData.TryGetProperty("note", out var noteProp) || ohData.TryGetProperty("Note", out noteProp) ? noteProp.GetString() : null;

                            location.OpeningHours.Add(new LocationOpeningHour
                            {
                                LocationId = location.Id,
                                DayOfWeek = dayOfWeek,
                                OpenTime = !string.IsNullOrEmpty(openTimeStr) ? TimeSpan.Parse(openTimeStr) : TimeSpan.FromHours(8),
                                CloseTime = !string.IsNullOrEmpty(closeTimeStr) ? TimeSpan.Parse(closeTimeStr) : TimeSpan.FromHours(17),
                                Note = note
                            });
                        }
                    }
                    continue;
                }

                // Handle Seasons specially
                if (change.Key.Equals("Seasons", StringComparison.OrdinalIgnoreCase))
                {
                    var seasonsData = JsonSerializer.Deserialize<List<JsonElement>>(change.Value.ToString());
                    if (seasonsData != null)
                    {
                        foreach (var seasonData in seasonsData)
                        {
                            var description = seasonData.TryGetProperty("description", out var descProp)
                                ? descProp.GetString()
                                : "";

                            string months = "";
                            if (seasonData.TryGetProperty("months", out var monthsProp))
                            {
                                if (monthsProp.ValueKind == JsonValueKind.String)
                                {
                                    months = monthsProp.GetString() ?? "";
                                }
                                else if (monthsProp.ValueKind == JsonValueKind.Array)
                                {
                                    var monthList = new List<string>();
                                    foreach (var element in monthsProp.EnumerateArray())
                                    {
                                        monthList.Add(element.ToString());
                                    }
                                    months = string.Join(",", monthList);
                                }
                            }

                            location.Seasons.Add(new LocationSeason
                            {
                                LocationId = location.Id,
                                Description = description ?? "",
                                Months = months
                            });
                        }
                    }
                    continue;
                }

                // Handle other properties via reflection
                var property = typeof(Location).GetProperties()
                    .FirstOrDefault(p => p.Name.Equals(change.Key, StringComparison.OrdinalIgnoreCase));

                if (property != null && property.CanWrite)
                {
                    try
                    {
                        var value = change.Value.Deserialize(property.PropertyType);
                        property.SetValue(location, value);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to set property {change.Key}: {ex.Message}");
                    }
                }
            }

            return Result.Success;
        }

        private async Task UpdateLocationWithSubmissionData(Location location, LocationSubmission submission, CancellationToken cancellationToken)
        {
            // Parse JSON fields
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

            // Update location with submission data
            location.Name = submission.Name;
            location.Description = submission.Description;
            location.Latitude = submission.Latitude;
            location.Longitude = submission.Longitude;
            location.TicketPrice = submission.TicketPrice;
            location.MinimumAge = submission.MinimumAge;
            location.Address = submission.Address;
            location.Telephone = submission.Telephone;
            location.Email = submission.Email;
            location.PriceMinUsd = submission.PriceMinUsd;
            location.PriceMaxUsd = submission.PriceMaxUsd;
            location.RecommendedDurationMinutes = submission.RecommendedDurationMinutes;
            location.Score = submission.Score;
            location.SourceUrl = submission.SourceUrl;

            // Update district and location type if provided
            if (submission.DistrictId.HasValue)
                location.DistrictId = submission.DistrictId.Value;
            if (submission.LocationTypeId.HasValue)
                location.LocationTypeId = submission.LocationTypeId.Value;

            // Clear and replace related collections (prevent duplicates)
            location.OpeningHours.Clear();
            location.Seasons.Clear();
            location.SocialLinks.Clear();
            location.LocationMedias.Clear();
            location.LocationAmenities.Clear();
            location.LocationTags.Clear();

            // Parse and add opening hours
            if (!string.IsNullOrEmpty(submission.OpeningHoursJson))
            {
                var openingHoursData = JsonSerializer.Deserialize<List<JsonElement>>(submission.OpeningHoursJson);
                if (openingHoursData != null)
                {
                    foreach (var ohData in openingHoursData)
                    {
                        int dayOfWeekValue = 1;
                        if (ohData.TryGetProperty("dayOfWeek", out var dowProp) || ohData.TryGetProperty("DayOfWeek", out dowProp))
                        {
                            dayOfWeekValue = dowProp.GetInt32();
                        }

                        var dayOfWeek = (DayOfWeek)(dayOfWeekValue == 7 ? 0 : dayOfWeekValue);

                        var openTimeStr = ohData.TryGetProperty("openTime", out var otProp) || ohData.TryGetProperty("OpenTime", out otProp)
                            ? otProp.GetString()
                            : "08:00";

                        var closeTimeStr = ohData.TryGetProperty("closeTime", out var ctProp) || ohData.TryGetProperty("CloseTime", out ctProp)
                            ? ctProp.GetString()
                            : "17:00";

                        var note = ohData.TryGetProperty("note", out var noteProp) || ohData.TryGetProperty("Note", out noteProp) ? noteProp.GetString() : null;

                        location.OpeningHours.Add(new LocationOpeningHour
                        {
                            Location = location,
                            DayOfWeek = dayOfWeek,
                            OpenTime = !string.IsNullOrEmpty(openTimeStr) ? TimeSpan.Parse(openTimeStr) : TimeSpan.FromHours(8),
                            CloseTime = !string.IsNullOrEmpty(closeTimeStr) ? TimeSpan.Parse(closeTimeStr) : TimeSpan.FromHours(17),
                            Note = note
                        });
                    }
                }
            }

            // Parse and add seasons
            if (!string.IsNullOrEmpty(submission.SeasonsJson))
            {
                var seasonsData = JsonSerializer.Deserialize<List<JsonElement>>(submission.SeasonsJson);
                if (seasonsData != null)
                {
                    foreach (var seasonData in seasonsData)
                    {
                        // Handle both camelCase and PascalCase property names
                        var description = seasonData.TryGetProperty("description", out var descProp1)
                            ? descProp1.GetString()
                            : (seasonData.TryGetProperty("Description", out var descProp2)
                                ? descProp2.GetString()
                                : "");

                        string months = "";
                        if (seasonData.TryGetProperty("months", out var monthsProp1))
                        {
                            if (monthsProp1.ValueKind == JsonValueKind.String)
                            {
                                months = monthsProp1.GetString() ?? "";
                            }
                            else if (monthsProp1.ValueKind == JsonValueKind.Array)
                            {
                                var monthList = new List<string>();
                                foreach (var element in monthsProp1.EnumerateArray())
                                {
                                    monthList.Add(element.ToString());
                                }
                                months = string.Join(",", monthList);
                            }
                        }
                        else if (seasonData.TryGetProperty("Months", out var monthsProp2))
                        {
                            if (monthsProp2.ValueKind == JsonValueKind.String)
                            {
                                months = monthsProp2.GetString() ?? "";
                            }
                            else if (monthsProp2.ValueKind == JsonValueKind.Array)
                            {
                                var monthList = new List<string>();
                                foreach (var element in monthsProp2.EnumerateArray())
                                {
                                    monthList.Add(element.ToString());
                                }
                                months = string.Join(",", monthList);
                            }
                        }

                        location.Seasons.Add(new LocationSeason
                        {
                            Location = location,
                            Description = description ?? "",
                            Months = months
                        });
                    }
                }
            }

            // Add social links
            if (socialLinks != null && socialLinks.Count > 0)
            {
                foreach (var socialLink in socialLinks)
                {
                    location.SocialLinks.Add(new LocationSocialLink
                    {
                        Location = location,
                        Platform = (SocialPlatform)socialLink.Platform,
                        Url = socialLink.Url
                    });
                }
            }

            // Add media links
            if (mediaLinks != null && mediaLinks.Count > 0)
            {
                foreach (var link in mediaLinks)
                {
                    location.LocationMedias.Add(new LocationMedia
                    {
                        Location = location,
                        Link = link
                    });
                }
            }

            // Add amenities
            if (amenityIds != null && amenityIds.Count > 0)
            {
                var amenities = await _amenityRepository.Query()
                    .Where(a => amenityIds.Contains(a.Id) && !a.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var amenityId in amenityIds)
                {
                    var amenity = amenities.FirstOrDefault(a => a.Id == amenityId);
                    if (amenity != null)
                    {
                        location.LocationAmenities.Add(new LocationAmenity
                        {
                            Location = location,
                            Amenity = amenity
                        });
                    }
                }
            }

            // Add tags
            if (tagIds != null && tagIds.Count > 0)
            {
                var tags = await _tagRepository.Query()
                    .Where(t => tagIds.Contains(t.Id) && !t.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var tagId in tagIds)
                {
                    var tag = tags.FirstOrDefault(t => t.Id == tagId);
                    if (tag != null)
                    {
                        location.LocationTags.Add(new LocationTag
                        {
                            Location = location,
                            Tag = tag
                        });
                    }
                }
            }
        }
    }

    public class ReviewLocationSubmissionCommandValidator : AbstractValidator<ReviewLocationSubmissionCommand>
    {
        public ReviewLocationSubmissionCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty();
            RuleFor(x => x.Status).IsInEnum();
            RuleFor(x => x.ReviewedBy).NotEmpty();
            RuleFor(x => x.RejectionReason)
                .NotEmpty().MaximumLength(500)
                .When(x => x.Status == SubmissionStatus.Rejected)
                .WithMessage("Rejection reason is required when rejecting a submission.");
        }
    }
}
