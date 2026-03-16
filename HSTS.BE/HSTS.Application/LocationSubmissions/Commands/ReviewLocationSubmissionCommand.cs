using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
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

            // If approving and not already created, create the Location
            if (request.Status == Domain.Entities.SubmissionStatus.Approved && submission.CreatedLocationId == null)
            {
                // Validate required fields for location
                if (submission.DestinationId == null)
                {
                    return Error.Validation("LocationSubmission.DestinationRequired", 
                        "Destination is required to create a location.");
                }

                if (submission.LocationTypeId == null)
                {
                    return Error.Validation("LocationSubmission.LocationTypeRequired", 
                        "Location type is required to create a location.");
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
                    RecommendedDurationMinutes = null
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

            submission.Status = request.Status;
            submission.RejectionReason = request.RejectionReason;
            submission.ReviewedBy = request.ReviewedBy;
            submission.ReviewedAt = DateTime.UtcNow;
            submission.UpdatedBy = request.ReviewedBy;
            submission.UpdatedAt = DateTime.UtcNow;

            await _submissionRepository.UpdateAsync(submission, cancellationToken);

            return submission.ToDto();
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
