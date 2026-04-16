using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Locations.Queries;

public record GetPublicLocationDetailQuery(int Id)
    : IRequest<ErrorOr<PublicLocationDetailDto>>;

public class GetPublicLocationDetailQueryValidator : AbstractValidator<GetPublicLocationDetailQuery>
{
    public GetPublicLocationDetailQueryValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
    }
}

public class GetPublicLocationDetailQueryHandler : IRequestHandler<GetPublicLocationDetailQuery, ErrorOr<PublicLocationDetailDto>>
{
    private readonly IAppDbContext _context;

    public GetPublicLocationDetailQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ErrorOr<PublicLocationDetailDto>> Handle(GetPublicLocationDetailQuery request, CancellationToken cancellationToken)
    {
        var location = await _context.Locations
            .AsNoTracking()
            .Include(x => x.District)
            .ThenInclude(x => x!.Province)
            .Include(x => x.LocationType)
            .Include(x => x.LocationMedias)
            .Include(x => x.LocationTags)
            .ThenInclude(x => x.Tag)
            .Include(x => x.LocationAmenities)
            .ThenInclude(x => x.Amenity)
            .Include(x => x.OpeningHours)
            .Include(x => x.Seasons)
            .Include(x => x.Closures)
            .Include(x => x.SocialLinks)
            .FirstOrDefaultAsync(x => x.Id == request.Id
                && !x.IsDeleted
                && x.Status == LocationStatus.Active
                && x.District != null
                && x.District.Province != null
                && !x.District.IsDeleted
                && !x.District.Province.IsDeleted, cancellationToken);

        if (location is null)
        {
            return Error.NotFound("Location.NotFound", $"Public location with ID {request.Id} not found.");
        }

        var visibleReviews = _context.LocationReviews
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                && x.Status == LocationReviewStatus.Visible
                && x.LocationId == location.Id);

        var reviewCount = await visibleReviews.CountAsync(cancellationToken);
        var averageRating = reviewCount == 0
            ? (decimal?)null
            : await visibleReviews.AverageAsync(x => (decimal?)x.Rating, cancellationToken);

        var imageUrls = location.LocationMedias
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Id)
            .Select(x => x.Link)
            .ToList();

        return new PublicLocationDetailDto(
            location.Id,
            location.Name,
            location.District!.Province!.Name,
            location.District!.Name,
            location.Address,
            location.Description,
            averageRating,
            reviewCount,
            imageUrls,
            location.LocationType is null ? null : location.LocationType.ToPublicLocationTypeDto(),
            location.LocationTags
                .Where(tag => !tag.IsDeleted && tag.Tag != null && !tag.Tag.IsDeleted)
                .Select(tag => tag.Tag!.ToPublicTagDto())
                .ToList(),
            location.LocationAmenities
                .Where(amenity => !amenity.IsDeleted && amenity.Amenity != null && !amenity.Amenity.IsDeleted)
                .Select(amenity => amenity.Amenity!.ToPublicAmenityDto())
                .ToList(),
            location.OpeningHours
                .Where(hour => !hour.IsDeleted)
                .OrderBy(hour => hour.DayOfWeek)
                .Select(hour => new PublicOpeningHourDto(hour.DayOfWeek, hour.OpenTime, hour.CloseTime, hour.Note))
                .ToList(),
            location.Seasons
                .Where(season => !season.IsDeleted)
                .Select(season => new PublicSeasonDto(season.Description, season.Months))
                .ToList(),
            location.PriceMinUsd,
            location.PriceMaxUsd,
            location.TicketPrice,
            location.RecommendedDurationMinutes,
            location.MinimumAge,
            location.Latitude,
            location.Longitude,
            location.Telephone,
            location.Email,
            location.SourceUrl,
            location.GetEffectiveStatus().ToString(),
            location.SocialLinks
                .Where(link => !link.IsDeleted)
                .Select(link => new PublicSocialLinkDto(link.Platform.ToString(), link.Url))
                .ToList());
    }
}
