using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
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
        private readonly IRepository<LocationSubmission> _submissionRepository;
        private readonly IRepository<Location> _locationRepository;
        private readonly IRepository<Tag> _tagRepository;
        private readonly IRepository<Amenity> _amenityRepository;

        public ReviewLocationSubmissionCommandHandler(
            IRepository<LocationSubmission> submissionRepository,
            IRepository<Location> locationRepository,
            IRepository<Tag> tagRepository,
            IRepository<Amenity> amenityRepository)
        {
            _submissionRepository = submissionRepository;
            _locationRepository = locationRepository;
            _tagRepository = tagRepository;
            _amenityRepository = amenityRepository;
        }

        public async Task<ErrorOr<LocationSubmissionDto>> Handle(ReviewLocationSubmissionCommand request, CancellationToken cancellationToken)
        {
            var submission = await _submissionRepository.Query()
                .Include(s => s.Destination)
                .Include(s => s.LocationType)
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
                    await CreateNewLocation(submission, request.ReviewedBy, cancellationToken);
                }
                else if (submission.SubmissionType == Domain.Entities.SubmissionType.EditExisting && submission.ExistingLocationId != null)
                {
                    // Update EXISTING location
                    await UpdateExistingLocation(submission, request.ReviewedBy, cancellationToken);
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

            return submission.ToDto();
        }

        private async Task CreateNewLocation(LocationSubmission submission, string reviewedBy, CancellationToken cancellationToken)
        {
            // Validate required fields for location
            if (submission.DestinationId == null)
            {
                throw new InvalidOperationException("Destination is required to create a location.");
            }

            if (submission.LocationTypeId == null)
            {
                throw new InvalidOperationException("Location type is required to create a location.");
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
                TicketPrice = submission.PriceMinUsd ?? 0,
                MinimumAge = 0,
                Address = submission.Address,
                Telephone = submission.Telephone,
                Email = submission.Email,
                DestinationId = submission.DestinationId.Value,
                LocationTypeId = submission.LocationTypeId.Value,
                PriceMinUsd = submission.PriceMinUsd,
                PriceMaxUsd = submission.PriceMaxUsd,
                RecommendedDurationMinutes = null,
                Score = submission.Score
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
                        Platform = socialLink.Platform,
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

            await _locationRepository.UpdateAsync(location, cancellationToken);

            // Update submission with created location ID
            submission.CreatedLocationId = location.Id;
        }

        private async Task UpdateExistingLocation(LocationSubmission submission, string reviewedBy, CancellationToken cancellationToken)
        {
            if (submission.ExistingLocationId == null || string.IsNullOrEmpty(submission.ProposedChangesJson))
            {
                throw new InvalidOperationException("Existing location ID and proposed changes are required for edit submissions.");
            }

            var location = await _locationRepository.GetAsync(submission.ExistingLocationId.Value, cancellationToken);

            if (location == null)
            {
                throw new InvalidOperationException("Existing location not found.");
            }

            // Deserialize and apply proposed changes
            var changes = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(submission.ProposedChangesJson);

            if (changes == null)
            {
                throw new InvalidOperationException("No proposed changes found.");
            }

            foreach (var change in changes)
            {
                // Case-insensitive property matching (frontend sends "name", C# has "Name")
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
                        // Log error but continue with other properties
                        Console.WriteLine($"Failed to set property {change.Key}: {ex.Message}");
                    }
                }
            }

            location.UpdatedAt = DateTime.UtcNow;
            await _locationRepository.UpdateAsync(location, cancellationToken);
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
