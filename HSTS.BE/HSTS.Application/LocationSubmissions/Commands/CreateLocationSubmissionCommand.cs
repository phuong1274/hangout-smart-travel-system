using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Application.LocationSubmissions;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Commands
{
    public record CreateLocationSubmissionCommand(
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
        List<LocationSubmissionSocialLinkDto>? SocialLinks,
        List<int>? AmenityIds,
        List<int>? TagIds,
        Domain.Entities.SubmissionType SubmissionType = Domain.Entities.SubmissionType.NewLocation,
        int? ExistingLocationId = null,
        Dictionary<string, object>? ProposedChanges = null
    ) : IRequest<ErrorOr<LocationSubmissionDto>>;

    public class CreateLocationSubmissionCommandHandler : IRequestHandler<CreateLocationSubmissionCommand, ErrorOr<LocationSubmissionDto>>
    {
        private readonly IRepository<LocationSubmission> _repository;
        private readonly IRepository<Location> _locationRepository;
        private readonly ICurrentUserService _currentUser;

        public CreateLocationSubmissionCommandHandler(
            IRepository<LocationSubmission> repository,
            IRepository<Location> locationRepository,
            ICurrentUserService currentUser)
        {
            _repository = repository;
            _locationRepository = locationRepository;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<LocationSubmissionDto>> Handle(CreateLocationSubmissionCommand request, CancellationToken cancellationToken)
        {
            var existingSubmission = await _repository.Query()
                .Where(x => x.Name == request.Name && x.UserId == _currentUser.UserId && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingSubmission != null)
            {
                return Error.Conflict("LocationSubmission.DuplicateName",
                    $"A submission with the name '{request.Name}' already exists for this user.");
            }

            // Validate ownership for EditExisting submissions
            if (request.SubmissionType == SubmissionType.EditExisting)
            {
                if (request.ExistingLocationId == null)
                {
                    return Error.Validation("Submission.LocationIdRequired",
                        "ExistingLocationId is required for edit submissions.");
                }

                var location = await _locationRepository.GetAsync(request.ExistingLocationId.Value, cancellationToken);
                
                if (location == null)
                {
                    return Error.NotFound("Location.NotFound",
                        $"Location with ID {request.ExistingLocationId} not found.");
                }

                if (location.OwnerId != _currentUser.UserId)
                {
                    return Error.Forbidden("Location.NotOwner",
                        "Only the location owner can submit edit requests.");
                }
            }

            var submission = new LocationSubmission
            {
                Name = request.Name,
                Description = request.Description,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Address = request.Address,
                Telephone = request.Telephone,
                Email = request.Email,
                PriceMinUsd = request.PriceMinUsd,
                PriceMaxUsd = request.PriceMaxUsd,
                Score = request.Score,
                DestinationId = request.DestinationId,
                LocationTypeId = request.LocationTypeId,
                UserId = _currentUser.UserId,
                CreatedBy = _currentUser.UserId.ToString(),
                SubmissionType = request.SubmissionType,
                ExistingLocationId = request.ExistingLocationId,
                Status = Domain.Entities.SubmissionStatus.Pending,
                MediaLinksJson = request.MediaLinks != null && request.MediaLinks.Count > 0
                    ? JsonSerializer.Serialize(request.MediaLinks)
                    : null,
                SocialLinksJson = request.SocialLinks != null && request.SocialLinks.Count > 0
                    ? JsonSerializer.Serialize(request.SocialLinks)
                    : null,
                AmenityIdsJson = request.AmenityIds != null && request.AmenityIds.Count > 0
                    ? JsonSerializer.Serialize(request.AmenityIds)
                    : null,
                TagIdsJson = request.TagIds != null && request.TagIds.Count > 0
                    ? JsonSerializer.Serialize(request.TagIds)
                    : null,
                ProposedChangesJson = request.ProposedChanges != null && request.ProposedChanges.Count > 0
                    ? JsonSerializer.Serialize(request.ProposedChanges)
                    : null
            };

            await _repository.AddAsync(submission, cancellationToken);
            await _repository.UpdateAsync(submission, cancellationToken);

            return submission.ToDto();
        }
    }

    public class CreateLocationSubmissionCommandValidator : AbstractValidator<CreateLocationSubmissionCommand>
    {
        public CreateLocationSubmissionCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).MaximumLength(2000);
            RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
            RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
            RuleFor(x => x.Address).NotEmpty().MaximumLength(300);
            RuleFor(x => x.Telephone).MaximumLength(50).When(x => !string.IsNullOrEmpty(x.Telephone));
            RuleFor(x => x.Email).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrEmpty(x.Email));
            RuleFor(x => x.PriceMinUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMinUsd.HasValue);
            RuleFor(x => x.PriceMaxUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMaxUsd.HasValue);

            RuleFor(x => x.DestinationId).NotEmpty().When(x => x.DestinationId.HasValue)
                .WithMessage("Destination ID must be provided if specified.");
            RuleFor(x => x.LocationTypeId).NotEmpty().When(x => x.LocationTypeId.HasValue)
                .WithMessage("Location Type ID must be provided if specified.");

            // Validate social links
            RuleForEach(x => x.SocialLinks).ChildRules(link =>
            {
                link.RuleFor(x => x.Platform).NotEmpty().MaximumLength(50);
                link.RuleFor(x => x.Url).NotEmpty().MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Url));
            });
        }
    }
}
