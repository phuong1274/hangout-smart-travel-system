using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Locations.Commands
{
    public record SocialLinkDto(string Platform, string Url);

    public record CreateLocationCommand(
        string Name,
        string? Description,
        double Latitude,
        double Longitude,
        decimal TicketPrice,
        int MinimumAge,
        string Address,
        int LocationTypeId,
        int DestinationId,
        string? Telephone,
        string? Email,
        decimal? PriceMinUsd,
        decimal? PriceMaxUsd,
        int? RecommendedDurationMinutes,
        decimal? Score,
        List<int>? TagIds,
        List<string>? MediaLinks,
        List<SocialLinkDto>? SocialLinks,
        List<int>? AmenityIds,
        List<LocationOpeningHourDto>? OpeningHours,
        List<LocationSeasonDto>? Seasons) : IRequest<ErrorOr<LocationDto>>;

    public class CreateLocationCommandHandler : IRequestHandler<CreateLocationCommand, ErrorOr<LocationDto>>
    {
        private readonly IRepository<Location> _locationRepository;
        private readonly IRepository<Tag> _tagRepository;
        private readonly IRepository<Amenity> _amenityRepository;
        private readonly ICurrentUserService _currentUser;

        public CreateLocationCommandHandler(
            IRepository<Location> locationRepository,
            IRepository<Tag> tagRepository,
            IRepository<Amenity> amenityRepository,
            ICurrentUserService currentUser)
        {
            _locationRepository = locationRepository;
            _tagRepository = tagRepository;
            _amenityRepository = amenityRepository;
            _currentUser = currentUser;
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
                Description = request.Description,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                TicketPrice = request.TicketPrice,
                MinimumAge = request.MinimumAge,
                Address = request.Address,
                LocationTypeId = request.LocationTypeId,
                DestinationId = request.DestinationId,
                Telephone = request.Telephone,
                Email = request.Email,
                PriceMinUsd = request.PriceMinUsd,
                PriceMaxUsd = request.PriceMaxUsd,
                RecommendedDurationMinutes = request.RecommendedDurationMinutes,
                Score = request.Score,
                OwnerId = _currentUser.UserId
            };

            await _locationRepository.AddAsync(location, cancellationToken);

            // Add tags if provided
            if (request.TagIds != null && request.TagIds.Count > 0)
            {
                var tags = await _tagRepository.Query()
                    .Where(t => request.TagIds.Contains(t.Id) && !t.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var tagId in request.TagIds)
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

            // Add social links if provided
            if (request.SocialLinks != null && request.SocialLinks.Count > 0)
            {
                foreach (var socialLink in request.SocialLinks)
                {
                    location.SocialLinks.Add(new LocationSocialLink
                    {
                        LocationId = location.Id,
                        Platform = socialLink.Platform,
                        Url = socialLink.Url
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

            // Add opening hours if provided
            if (request.OpeningHours != null && request.OpeningHours.Count > 0)
            {
                foreach (var oh in request.OpeningHours)
                {
                    location.OpeningHours.Add(new LocationOpeningHour
                    {
                        LocationId = location.Id,
                        DayOfWeek = (DayOfWeek)oh.DayOfWeek,
                        OpenTime = oh.OpenTime,
                        CloseTime = oh.CloseTime,
                        Note = oh.Note
                    });
                }
            }

            // Add seasons if provided
            if (request.Seasons != null && request.Seasons.Count > 0)
            {
                foreach (var season in request.Seasons)
                {
                    location.Seasons.Add(new LocationSeason
                    {
                        LocationId = location.Id,
                        Description = season.Description,
                        Months = season.Months
                    });
                }
            }

            await _locationRepository.UpdateAsync(location, cancellationToken);

            return location.ToDto();
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
            RuleFor(x => x.LocationTypeId).NotEmpty();
            RuleFor(x => x.DestinationId).NotEmpty();
            RuleFor(x => x.Telephone).MaximumLength(50).When(x => !string.IsNullOrEmpty(x.Telephone));
            RuleFor(x => x.Email).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrEmpty(x.Email));
            RuleFor(x => x.PriceMinUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMinUsd.HasValue);
            RuleFor(x => x.PriceMaxUsd).GreaterThanOrEqualTo(0).When(x => x.PriceMaxUsd.HasValue);
            RuleFor(x => x.RecommendedDurationMinutes).GreaterThanOrEqualTo(0).When(x => x.RecommendedDurationMinutes.HasValue);

            // Validate social links
            RuleForEach(x => x.SocialLinks).ChildRules(link =>
            {
                link.RuleFor(x => x.Platform).NotEmpty().MaximumLength(50);
                link.RuleFor(x => x.Url).NotEmpty().MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Url));
            });
        }
    }
}
