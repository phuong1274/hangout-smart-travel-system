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
        List<int>? TagIds,
        List<string>? MediaLinks,
        List<SocialLinkDto>? SocialLinks,
        List<int>? AmenityIds) : IRequest<ErrorOr<LocationDto>>;

    public class UpdateLocationCommandHandler : IRequestHandler<UpdateLocationCommand, ErrorOr<LocationDto>>
    {
        private readonly IRepository<Location> _locationRepository;
        private readonly IRepository<Tag> _tagRepository;
        private readonly IRepository<Amenity> _amenityRepository;

        public UpdateLocationCommandHandler(
            IRepository<Location> locationRepository,
            IRepository<Tag> tagRepository,
            IRepository<Amenity> amenityRepository)
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
            location.Description = request.Description;
            location.Latitude = request.Latitude;
            location.Longitude = request.Longitude;
            location.TicketPrice = request.TicketPrice;
            location.MinimumAge = request.MinimumAge;
            location.Address = request.Address;
            location.LocationTypeId = request.LocationTypeId;
            location.DestinationId = request.DestinationId;
            location.Telephone = request.Telephone;
            location.Email = request.Email;
            location.PriceMinUsd = request.PriceMinUsd;
            location.PriceMaxUsd = request.PriceMaxUsd;
            location.RecommendedDurationMinutes = request.RecommendedDurationMinutes;
            location.UpdatedAt = DateTime.UtcNow;

            // Update tags if provided
            if (request.TagIds != null)
            {
                location.LocationTags.Clear();

                if (request.TagIds.Count > 0)
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
            }

            // Update media links if provided
            if (request.MediaLinks != null)
            {
                location.LocationMedias.Clear();

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

            // Update social links if provided
            if (request.SocialLinks != null)
            {
                location.SocialLinks.Clear();

                if (request.SocialLinks.Count > 0)
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
            }

            // Update amenities if provided
            if (request.AmenityIds != null)
            {
                location.LocationAmenities.Clear();

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

            return location.ToDto();
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
