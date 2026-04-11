using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Application.Common;
using HSTS.Domain.Entities;
using HSTS.Application.LocationSubmissions;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Commands
{
    public record UpdateLocationSubmissionCommand(
        int Id,
        string Name,
        string? Description,
        double Latitude,
        double Longitude,
        string Address,
        string? Telephone,
        string? Email,
        decimal TicketPrice,
        int MinimumAge,
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        decimal? Score,
        int? RecommendedDurationMinutes,
        string? SourceUrl,
        int? DistrictId,
        int? LocationTypeId,
        List<string>? MediaLinks,
        List<LocationSubmissionSocialLinkDto>? SocialLinks,
        List<int>? AmenityIds,
        List<int>? TagIds,
        List<LocationSubmissionOpeningHourDto>? OpeningHours,
        List<LocationSubmissionSeasonDto>? Seasons,
        Dictionary<string, object>? ProposedChanges = null
    ) : IRequest<ErrorOr<LocationSubmissionDto>>;

    public class UpdateLocationSubmissionCommandHandler : IRequestHandler<UpdateLocationSubmissionCommand, ErrorOr<LocationSubmissionDto>>
    {
        private readonly IRepository.IRepository<LocationSubmission> _repository;
        private readonly IRepository.IRepository<Location> _locationRepository;
        private readonly IRepository.IRepository<Tag> _tagRepository;
        private readonly ICurrentUserService _currentUser;

        public UpdateLocationSubmissionCommandHandler(
            IRepository.IRepository<LocationSubmission> repository,
            IRepository.IRepository<Location> locationRepository,
            IRepository.IRepository<Tag> tagRepository,
            ICurrentUserService currentUser)
        {
            _repository = repository;
            _locationRepository = locationRepository;
            _tagRepository = tagRepository;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<LocationSubmissionDto>> Handle(UpdateLocationSubmissionCommand request, CancellationToken cancellationToken)
        {
            var submission = await _repository.GetAsync(request.Id, cancellationToken);

            if (submission == null || submission.IsDeleted)
            {
                return Error.NotFound("LocationSubmission.NotFound", $"Submission with ID {request.Id} was not found.");
            }

            // Check if user owns this submission
            if (submission.UserId != _currentUser.UserId)
            {
                return Error.Forbidden("LocationSubmission.NotOwner", "You can only update your own submissions.");
            }

            // Only pending or rejected submissions can be updated
            if (submission.Status != Domain.Entities.SubmissionStatus.Rejected)
            {
                return Error.Conflict("LocationSubmission.CannotUpdate",
                    "Approved or published submissions cannot be updated. Please contact admin for changes.");
            }

            // Check if name or location actually changed
            const double epsilon = 0.00001;
            bool nameChanged = !string.Equals(request.Name.Trim(), submission.Name.Trim(), StringComparison.OrdinalIgnoreCase);
            bool locationChanged = Math.Abs(request.Latitude - submission.Latitude) > epsilon ||
                                   Math.Abs(request.Longitude - submission.Longitude) > epsilon;

            // Only perform duplicate check if name or location actually changed
            if (nameChanged || locationChanged)
            {
                // Duplicate check: same name (case-insensitive, trimmed) AND within 100 meters
                const double proximityThresholdMeters = 100.0;
                var normalizedName = request.Name.Trim().ToLowerInvariant();

                // Step 1: Find ACTIVE locations with matching name (case-insensitive), excluding self if applicable
                var candidateLocations = await _locationRepository.Query()
                    .Where(x => !x.IsDeleted
                        && x.Status == Domain.Enums.LocationStatus.Active
                        && x.Name.Trim().ToLower() == normalizedName)
                    .ToListAsync(cancellationToken);

                // Step 2: Filter by proximity using Haversine distance
                var duplicateLocation = candidateLocations.FirstOrDefault(loc =>
                    GeoUtils.HaversineMeters(request.Latitude, request.Longitude,
                        loc.Latitude, loc.Longitude) <= proximityThresholdMeters);

                if (duplicateLocation != null)
                {
                    var distance = GeoUtils.HaversineMeters(request.Latitude, request.Longitude,
                        duplicateLocation.Latitude, duplicateLocation.Longitude);
                    return Error.Conflict("LocationSubmission.Duplicate",
                        $"A location with the same name already exists within {distance:F0} meters.");
                }

                // Step 3: Check other PENDING submissions with same name AND proximity (excluding self)
                var candidateSubmissions = await _repository.Query()
                    .Where(x => !x.IsDeleted
                        && x.Id != request.Id
                        && x.Status == Domain.Entities.SubmissionStatus.Pending
                        && x.Name.Trim().ToLower() == normalizedName)
                    .ToListAsync(cancellationToken);

                var duplicateSubmission = candidateSubmissions.FirstOrDefault(sub =>
                    GeoUtils.HaversineMeters(request.Latitude, request.Longitude,
                        sub.Latitude, sub.Longitude) <= proximityThresholdMeters);

                if (duplicateSubmission != null)
                {
                    var distance = GeoUtils.HaversineMeters(request.Latitude, request.Longitude,
                        duplicateSubmission.Latitude, duplicateSubmission.Longitude);
                    return Error.Conflict("LocationSubmission.Duplicate",
                        $"A pending submission with the same name already exists within {distance:F0} meters.");
                }
            }

            submission.Name = request.Name;
            submission.Description = request.Description;
            submission.Latitude = request.Latitude;
            submission.Longitude = request.Longitude;
            submission.Address = request.Address;
            submission.Telephone = request.Telephone;
            submission.Email = request.Email;
            submission.TicketPrice = request.TicketPrice;
            submission.MinimumAge = request.MinimumAge;
            submission.PriceMinUsd = request.PriceMinUsd;
            submission.PriceMaxUsd = request.PriceMaxUsd;
            submission.Score = request.Score;
            submission.RecommendedDurationMinutes = request.RecommendedDurationMinutes;
            submission.SourceUrl = request.SourceUrl;
            submission.DistrictId = request.DistrictId;
            submission.LocationTypeId = request.LocationTypeId;
            submission.UpdatedBy = _currentUser.UserId.ToString();
            submission.UpdatedAt = DateTime.UtcNow;

            // Update JSON fields
            submission.MediaLinksJson = request.MediaLinks != null && request.MediaLinks.Count > 0
                ? JsonSerializer.Serialize(request.MediaLinks)
                : null;
            submission.SocialLinksJson = request.SocialLinks != null && request.SocialLinks.Count > 0
                ? JsonSerializer.Serialize(request.SocialLinks)
                : null;
            submission.AmenityIdsJson = request.AmenityIds != null && request.AmenityIds.Count > 0
                ? JsonSerializer.Serialize(request.AmenityIds)
                : null;
            submission.TagIdsJson = request.TagIds != null && request.TagIds.Count > 0
                ? JsonSerializer.Serialize(request.TagIds)
                : null;
            submission.OpeningHoursJson = request.OpeningHours != null && request.OpeningHours.Count > 0
                ? JsonSerializer.Serialize(request.OpeningHours.Select(oh => new
                {
                    oh.Id,
                    oh.DayOfWeek,
                    OpenTime = oh.OpenTime?.ToString(@"hh\:mm"),
                    CloseTime = oh.CloseTime?.ToString(@"hh\:mm"),
                    oh.Note
                }))
                : null;
            submission.SeasonsJson = request.Seasons != null && request.Seasons.Count > 0
                ? JsonSerializer.Serialize(request.Seasons)
                : null;
            submission.ProposedChangesJson = request.ProposedChanges != null && request.ProposedChanges.Count > 0
                ? JsonSerializer.Serialize(request.ProposedChanges)
                : null;

            // Reset status to pending when updated
            submission.Status = Domain.Entities.SubmissionStatus.Pending;
            submission.RejectionReason = null;

            await _repository.UpdateAsync(submission, cancellationToken);

            // Resolve tags for the response
            var tags = await LocationSubmissionMappingExtensions.ResolveTagsAsync(
                request.TagIds, 
                _tagRepository, 
                cancellationToken);

            return submission.ToDto(tags);
        }
    }

    public class UpdateLocationSubmissionCommandValidator : AbstractValidator<UpdateLocationSubmissionCommand>
    {
        public UpdateLocationSubmissionCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty();
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).MaximumLength(2000);
            RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
            RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
            RuleFor(x => x.Address).NotEmpty().MaximumLength(300);
            RuleFor(x => x.Telephone).MaximumLength(50).When(x => !string.IsNullOrEmpty(x.Telephone));
            RuleFor(x => x.Email).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrEmpty(x.Email));
            RuleFor(x => x.TicketPrice).GreaterThanOrEqualTo(0);
            RuleFor(x => x.MinimumAge).InclusiveBetween(0, 120);
            RuleFor(x => x.PriceMinUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMinUsd.HasValue);
            RuleFor(x => x.PriceMaxUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMaxUsd.HasValue);
            RuleFor(x => x.Score).InclusiveBetween(0, 5).When(x => x.Score.HasValue);
            RuleFor(x => x.RecommendedDurationMinutes).GreaterThanOrEqualTo(0).When(x => x.RecommendedDurationMinutes.HasValue);

            // Validate social links
            RuleForEach(x => x.SocialLinks).ChildRules(link =>
            {
                link.RuleFor(x => x.Platform)
                    .InclusiveBetween(1, 14)
                    .WithMessage($"Platform must be between 1 and 14 (valid SocialPlatform values).");
                link.RuleFor(x => x.Url).NotEmpty().MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Url));
            });
        }
    }
}
