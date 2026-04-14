using HSTS.Application.Home;
using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ErrorOr;
using FluentValidation;

namespace HSTS.Application.Home.Queries;

public record GetHomeDiscoveryQuery(int DestinationLimit = 6, int PopularLocationLimit = 8)
    : IRequest<ErrorOr<HomeDiscoveryDto>>;

public class GetHomeDiscoveryQueryValidator : AbstractValidator<GetHomeDiscoveryQuery>
{
    public GetHomeDiscoveryQueryValidator()
    {
        RuleFor(x => x.DestinationLimit).GreaterThan(0);
        RuleFor(x => x.PopularLocationLimit).GreaterThan(0);
    }
}

public class GetHomeDiscoveryQueryHandler : IRequestHandler<GetHomeDiscoveryQuery, ErrorOr<HomeDiscoveryDto>>
{
    private readonly IAppDbContext _context;

    public GetHomeDiscoveryQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ErrorOr<HomeDiscoveryDto>> Handle(GetHomeDiscoveryQuery request, CancellationToken cancellationToken)
    {
        var visibleLocationsQuery = _context.Locations
            .AsNoTracking()
            .Include(x => x.District)
            .ThenInclude(x => x!.Province)
            .Include(x => x.LocationMedias)
            .Where(x => !x.IsDeleted
                && x.Status == LocationStatus.Active
                && x.District != null
                && x.District.Province != null
                && !x.District.IsDeleted
                && !x.District.Province.IsDeleted);

        var featuredDestinationsData = await visibleLocationsQuery
            .Select(x => new
            {
                ProvinceId = x.District!.ProvinceId,
                ProvinceName = x.District.Province!.Name
            })
            .GroupBy(x => new { x.ProvinceId, x.ProvinceName })
            .Select(x => new
            {
                x.Key.ProvinceId,
                x.Key.ProvinceName,
                LocationCount = x.Count()
            })
            .OrderByDescending(x => x.LocationCount)
            .ThenBy(x => x.ProvinceName)
            .Take(request.DestinationLimit)
            .ToListAsync(cancellationToken);

        var featuredDestinations = featuredDestinationsData
            .Select(x => new PublicDestinationDto(
                x.ProvinceId!.Value,
                x.ProvinceName,
                x.LocationCount))
            .ToList();

        var popularLocations = await visibleLocationsQuery
            .OrderByDescending(x => x.Score ?? 0)
            .ThenByDescending(x => x.CreatedAt)
            .Take(request.PopularLocationLimit)
            .Select(x => new
            {
                x.Id,
                x.Name,
                Destination = x.District!.Province!.Name,
                District = x.District!.Name,
                x.Score,
                ImageUrl = x.LocationMedias
                    .Where(m => !m.IsDeleted)
                    .OrderBy(m => m.Id)
                    .Select(m => m.Link)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var popularLocationIds = popularLocations.Select(x => x.Id).ToList();

        var reviewCounts = await _context.LocationReviews
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                && x.Status == LocationReviewStatus.Visible
                && popularLocationIds.Contains(x.LocationId))
            .GroupBy(x => x.LocationId)
            .Select(x => new { LocationId = x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.LocationId, x => x.Count, cancellationToken);

        var popularLocationDtos = popularLocations
            .Select(x => new PublicLocationCardDto(
                x.Id,
                x.Name,
                x.Destination,
                x.District,
                string.Empty,
                null,
                x.Score,
                reviewCounts.GetValueOrDefault(x.Id),
                x.ImageUrl,
                null,
                [],
                null,
                null,
                null,
                null,
                LocationStatus.Active.ToString()))
            .ToList();

        var tripCount = await _context.Trips
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted, cancellationToken);

        var socialProof = new HomeSocialProofDto(
            "Current discovery coverage",
            "A quick view of how much destination and location data is currently available to support trip planning.",
            [
                new HomeSocialProofStatDto(
                    "destinations",
                    "Destinations available",
                    featuredDestinations.Count,
                    "Browse province-level starting points before choosing where to focus."),
                new HomeSocialProofStatDto(
                    "locations",
                    "Locations to compare",
                    await visibleLocationsQuery.CountAsync(cancellationToken),
                    "See how many places are currently available to review and shortlist."),
                new HomeSocialProofStatDto(
                    "plannedTrips",
                    "Trips planned",
                    tripCount,
                    "Track how many itineraries have already been created in the platform.")
            ]);

        return new HomeDiscoveryDto(featuredDestinations, popularLocationDtos, socialProof);
    }
}
