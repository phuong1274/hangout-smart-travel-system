using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Commands
{
    public record UpdateLocationCommand(
        int Id,
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

    public class UpdateLocationCommandHandler : IRequestHandler<UpdateLocationCommand, ErrorOr<LocationDto>>
    {
        private readonly IRepository<Location> _locationRepository;
        private readonly IRepository<Tag> _tagRepository;
        private readonly IRepository<Amenity> _amenityRepository;

        public UpdateLocationCommandHandler(IRepository<Location> locationRepository, IRepository<Tag> tagRepository, IRepository<Amenity> amenityRepository)
        {
            _locationRepository = locationRepository;
            _tagRepository = tagRepository;
            _amenityRepository = amenityRepository;
        }

        public async Task<ErrorOr<LocationDto>> Handle(UpdateLocationCommand request, CancellationToken cancellationToken)
        {
            var location = await _locationRepository.GetAsync(request.Id, cancellationToken);

            if (location == null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.Id} was not found.");
            }

            var existingLocationWithName = await _locationRepository.Query()
                .Where(x => x.Name == request.Name && x.Id != request.Id && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingLocationWithName != null)
            {
                return Error.Conflict("Location.DuplicateName",
                    $"A location with the name '{request.Name}' already exists.");
            }

            location.Name = request.Name;
            location.Description = request.Description ?? string.Empty;
            location.Latitude = request.Latitude;
            location.Longitude = request.Longitude;
            location.TicketPrice = request.TicketPrice;
            location.MinimumAge = request.MinimumAge;
            location.Address = request.Address;
            location.SocialLink = request.SocialLink;
            location.LocationTypeId = request.LocationTypeId;
            location.DestinationId = request.DestinationId;
            location.Telephone = request.Telephone;
            location.Email = request.Email;
            location.Rating = request.Rating;
            location.ReviewCount = request.ReviewCount;
            location.PriceRange = request.PriceRange;
            location.PriceMinUsd = request.PriceMinUsd;
            location.PriceMaxUsd = request.PriceMaxUsd;
            location.Source = request.Source;
            location.SourceUrl = request.SourceUrl;
            location.RecommendedDurationMinutes = request.RecommendedDurationMinutes;
            location.UpdatedAt = DateTime.UtcNow;

            // Update tags with scores if provided
            if (request.TagsWithScores != null)
            {
                // Remove existing tags
                location.LocationTags.Clear();

                // Add new tags with scores
                if (request.TagsWithScores.Count > 0)
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
            }

            // Update media links if provided
            if (request.MediaLinks != null)
            {
                // Remove existing media
                location.LocationMedias.Clear();

                // Add new media links
                if (request.MediaLinks.Count > 0)
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
            }

            // Update amenities if provided
            if (request.AmenityIds != null)
            {
                // Remove existing amenities
                location.LocationAmenities.Clear();

                // Add new amenities
                if (request.AmenityIds.Count > 0)
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

    public class UpdateLocationCommandValidator : AbstractValidator<UpdateLocationCommand>
    {
        public UpdateLocationCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty();
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
