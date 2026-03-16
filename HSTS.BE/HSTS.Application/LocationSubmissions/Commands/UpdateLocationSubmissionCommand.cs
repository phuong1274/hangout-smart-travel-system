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
    public record UpdateLocationSubmissionCommand(
        int Id,
        string Name,
        string? Description,
        double Latitude,
        double Longitude,
        string Address,
        string? Telephone,
        string? Email,
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        int? DestinationId,
        int? LocationTypeId,
        List<string>? MediaLinks,
        List<LocationSubmissionSocialLinkDto>? SocialLinks,
        List<int>? AmenityIds,
        List<int>? TagIds
    ) : IRequest<ErrorOr<LocationSubmissionDto>>;

    public class UpdateLocationSubmissionCommandHandler : IRequestHandler<UpdateLocationSubmissionCommand, ErrorOr<LocationSubmissionDto>>
    {
        private readonly IRepository<LocationSubmission> _repository;
        private readonly ICurrentUserService _currentUser;

        public UpdateLocationSubmissionCommandHandler(
            IRepository<LocationSubmission> repository,
            ICurrentUserService currentUser)
        {
            _repository = repository;
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
            if (submission.Status == Domain.Entities.SubmissionStatus.Approved ||
                submission.Status == Domain.Entities.SubmissionStatus.Published)
            {
                return Error.Conflict("LocationSubmission.CannotUpdate",
                    "Approved or published submissions cannot be updated. Please contact admin for changes.");
            }

            var existingSubmissionWithName = await _repository.Query()
                .Where(x => x.Name == request.Name && x.Id != request.Id && x.UserId == _currentUser.UserId && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingSubmissionWithName != null)
            {
                return Error.Conflict("LocationSubmission.DuplicateName",
                    $"A submission with the name '{request.Name}' already exists.");
            }

            submission.Name = request.Name;
            submission.Description = request.Description;
            submission.Latitude = request.Latitude;
            submission.Longitude = request.Longitude;
            submission.Address = request.Address;
            submission.Telephone = request.Telephone;
            submission.Email = request.Email;
            submission.PriceMinUsd = request.PriceMinUsd;
            submission.PriceMaxUsd = request.PriceMaxUsd;
            submission.DestinationId = request.DestinationId;
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

            // Reset status to pending when updated
            submission.Status = Domain.Entities.SubmissionStatus.Pending;
            submission.RejectionReason = null;

            await _repository.UpdateAsync(submission, cancellationToken);

            return submission.ToDto();
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
            RuleFor(x => x.PriceMinUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMinUsd.HasValue);
            RuleFor(x => x.PriceMaxUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMaxUsd.HasValue);

            // Validate social links
            RuleForEach(x => x.SocialLinks).ChildRules(link =>
            {
                link.RuleFor(x => x.Platform).NotEmpty().MaximumLength(50);
                link.RuleFor(x => x.Url).NotEmpty().MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Url));
            });
        }
    }
}
