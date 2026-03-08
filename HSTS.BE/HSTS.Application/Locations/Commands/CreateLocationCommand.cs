using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Commands
{
    // DTO for tag with score
    public record TagScoreDto(int TagId, double Score);

    public record CreateLocationCommand(
        string Name,
        string Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        string? SocialLink,
        int LocationTypeId,
        int DestinationId,
        string? Telephone,
        string? Email,
        decimal? Rating,
        int? ReviewCount,
        string? PriceRange,
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        string? Source,
        string? SourceUrl,
        int? RecommendedDurationMinutes,
        List<TagScoreDto>? TagsWithScores,
        List<string>? MediaLinks,
        List<int>? AmenityIds) : IRequest<ErrorOr<LocationDto>>;

    public class CreateLocationCommandHandler : IRequestHandler<CreateLocationCommand, ErrorOr<LocationDto>>
    {
        private readonly IRepository<Location> _locationRepository;
        private readonly IRepository<Tag> _tagRepository;
        private readonly IRepository<Amenity> _amenityRepository;

        public CreateLocationCommandHandler(IRepository<Location> locationRepository, IRepository<Tag> tagRepository, IRepository<Amenity> amenityRepository)
        {
            _locationRepository = locationRepository;
            _tagRepository = tagRepository;
            _amenityRepository = amenityRepository;
        }

        public async Task<ErrorOr<LocationDto>> Handle(CreateLocationCommand request, CancellationToken cancellationToken)
        {
            var existingLocation = await _locationRepository.Query()
                .Where(x => x.Name == request.Name && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingLocation != null)
            {
                return Error.Conflict("Location.DuplicateName",
                    $"A location with the name '{request.Name}' already exists.");
            }

            var location = new Location
            {
                Name = request.Name,
                Description = request.Description ?? string.Empty,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                TicketPrice = request.TicketPrice,
                MinimumAge = request.MinimumAge,
                Address = request.Address,
                SocialLink = request.SocialLink,
                LocationTypeId = request.LocationTypeId,
                DestinationId = request.DestinationId,
                Telephone = request.Telephone,
                Email = request.Email,
                Rating = request.Rating,
                ReviewCount = request.ReviewCount,
                PriceRange = request.PriceRange,
                PriceMinUsd = request.PriceMinUsd,
                PriceMaxUsd = request.PriceMaxUsd,
                Source = request.Source,
                SourceUrl = request.SourceUrl,
                RecommendedDurationMinutes = request.RecommendedDurationMinutes
            };

            await _locationRepository.AddAsync(location, cancellationToken);

            // Add tags with scores if provided
            if (request.TagsWithScores != null && request.TagsWithScores.Count > 0)
            {
                var tagIds = request.TagsWithScores.Select(t => t.TagId).ToList();
                var tags = await _tagRepository.Query()
                    .Where(t => tagIds.Contains(t.Id) && !t.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var tagScore in request.TagsWithScores)
                {
                    var tag = tags.FirstOrDefault(t => t.Id == tagScore.TagId);
                    if (tag != null)
                    {
                        location.LocationTags.Add(new LocationTag
                        {
                            LocationId = location.Id,
                            TagId = tag.Id,
                            Score = tagScore.Score
                        });
                    }
                }
            }

            // Add media links if provided
            if (request.MediaLinks != null && request.MediaLinks.Count > 0)
            {
                foreach (var link in request.MediaLinks)
                {
                    location.LocationMedias.Add(new LocationMedia
                    {
                        LocationId = location.Id,
                        Link = link
                    });
                }
            }

            // Add amenities if provided
            if (request.AmenityIds != null && request.AmenityIds.Count > 0)
            {
                var amenities = await _amenityRepository.Query()
                    .Where(a => request.AmenityIds.Contains(a.Id) && !a.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var amenityId in request.AmenityIds)
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

            await _locationRepository.UpdateAsync(location, cancellationToken);

            return new LocationDto(
                location.Id,
                location.Name,
                location.Description,
                location.Latitude,
                location.Longitude,
                location.TicketPrice,
                location.MinimumAge,
                location.Address,
                location.SocialLink,
                location.LocationTypeId,
                location.DestinationId,
                null,
                null,
                request.TagsWithScores?.Select(t => t.TagId).ToList(),
                request.MediaLinks,
                request.Telephone,
                request.Email,
                request.Rating,
                request.ReviewCount,
                request.PriceRange,
                request.PriceMinUsd,
                request.PriceMaxUsd,
                request.Source,
                request.SourceUrl,
                request.RecommendedDurationMinutes,
                request.AmenityIds);
        }
    }

    public class CreateLocationCommandValidator : AbstractValidator<CreateLocationCommand>
    {
        public CreateLocationCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).MaximumLength(2000);
            RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
            RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
            RuleFor(x => x.TicketPrice).GreaterThanOrEqualTo(0);
            RuleFor(x => x.MinimumAge).InclusiveBetween(0, 120);
            RuleFor(x => x.Address).NotEmpty().MaximumLength(300);
            RuleFor(x => x.SocialLink).MaximumLength(500);
            RuleFor(x => x.LocationTypeId).NotEmpty();
            RuleFor(x => x.DestinationId).NotEmpty();
            RuleFor(x => x.Telephone).MaximumLength(50).When(x => !string.IsNullOrEmpty(x.Telephone));
            RuleFor(x => x.Email).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrEmpty(x.Email));
            RuleFor(x => x.Rating).InclusiveBetween(0, 10).When(x => x.Rating.HasValue);
            RuleFor(x => x.ReviewCount).GreaterThanOrEqualTo(0).When(x => x.ReviewCount.HasValue);
            RuleFor(x => x.PriceRange).MaximumLength(50).When(x => !string.IsNullOrEmpty(x.PriceRange));
            RuleFor(x => x.PriceMinUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMinUsd.HasValue);
            RuleFor(x => x.PriceMaxUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMaxUsd.HasValue);
            RuleFor(x => x.Source).MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Source));
            RuleFor(x => x.SourceUrl).MaximumLength(2000).When(x => !string.IsNullOrEmpty(x.SourceUrl));
            RuleFor(x => x.RecommendedDurationMinutes).GreaterThanOrEqualTo(0).When(x => x.RecommendedDurationMinutes.HasValue);

            // Validate tags with scores
            RuleFor(x => x.TagsWithScores)
                .Must(tags => tags == null || !tags.Any() || tags.Sum(t => t.Score) >= 0.99 && tags.Sum(t => t.Score) <= 1.01)
                .WithMessage("Tag scores must sum to 1.0 (±0.01 tolerance for floating point)");

            RuleForEach(x => x.TagsWithScores).ChildRules(tag =>
            {
                tag.RuleFor(x => x.TagId).NotEmpty().WithMessage("Tag ID is required");
                tag.RuleFor(x => x.Score).InclusiveBetween(0, 1).WithMessage("Score must be between 0 and 1");
            });
        }
    }
}
