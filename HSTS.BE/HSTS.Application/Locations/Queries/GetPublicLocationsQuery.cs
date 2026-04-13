using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Locations.Queries;

public record GetPublicLocationsQuery(
    int? DestinationId = null,
    int? DistrictId = null,
    int? LocationTypeId = null,
    List<int>? TagIds = null,
    string? Keyword = null,
    decimal? MinRating = null,
    decimal? MinBudget = null,
    decimal? MaxBudget = null,
    int? MaxDurationMinutes = null,
    int PageIndex = 1,
    int PageSize = 10)
    : IRequest<ErrorOr<PublicLocationPagedResponse>>;

public class GetPublicLocationsQueryValidator : AbstractValidator<GetPublicLocationsQuery>
{
    public GetPublicLocationsQueryValidator()
    {
        RuleFor(x => x.PageIndex).GreaterThan(0);
        RuleFor(x => x.PageSize).GreaterThan(0);
        RuleFor(x => x.MinRating).InclusiveBetween(0, 5).When(x => x.MinRating.HasValue);
        RuleFor(x => x.MinBudget).GreaterThanOrEqualTo(0).When(x => x.MinBudget.HasValue);
        RuleFor(x => x.MaxBudget).GreaterThanOrEqualTo(0).When(x => x.MaxBudget.HasValue);
        RuleFor(x => x.MaxBudget)
            .GreaterThanOrEqualTo(x => x.MinBudget!.Value)
            .When(x => x.MinBudget.HasValue && x.MaxBudget.HasValue);
        RuleFor(x => x.MaxDurationMinutes).GreaterThan(0).When(x => x.MaxDurationMinutes.HasValue);
    }
}

public class GetPublicLocationsQueryHandler : IRequestHandler<GetPublicLocationsQuery, ErrorOr<PublicLocationPagedResponse>>
{
    private readonly IAppDbContext _context;

    public GetPublicLocationsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ErrorOr<PublicLocationPagedResponse>> Handle(GetPublicLocationsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Locations
            .AsNoTracking()
            .Include(x => x.District)
            .ThenInclude(x => x!.Province)
            .Include(x => x.LocationType)
            .Include(x => x.LocationTags)
            .ThenInclude(x => x.Tag)
            .Include(x => x.LocationMedias)
            .Include(x => x.Closures)
            .Where(x => !x.IsDeleted
                && x.Status == LocationStatus.Active
                && x.District != null
                && x.District.Province != null
                && !x.District.IsDeleted
                && !x.District.Province.IsDeleted);

        if (request.DestinationId.HasValue)
        {
            query = query.Where(x => x.District!.ProvinceId == request.DestinationId.Value);
        }

        if (request.DistrictId.HasValue)
        {
            query = query.Where(x => x.DistrictId == request.DistrictId.Value);
        }

        if (request.LocationTypeId.HasValue)
        {
            query = query.Where(x => x.LocationTypeId == request.LocationTypeId.Value);
        }

        if (request.TagIds != null && request.TagIds.Count > 0)
        {
            query = query.Where(x => x.LocationTags.Any(lt => request.TagIds.Contains(lt.TagId)));
        }

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            query = query.Where(x => x.Name.Contains(request.Keyword)
                || (x.Description != null && x.Description.Contains(request.Keyword)));
        }

        if (request.MinRating.HasValue)
        {
            query = query.Where(x => (x.Score ?? 0) >= request.MinRating.Value);
        }

        if (request.MinBudget.HasValue)
        {
            query = query.Where(x => (x.PriceMinUsd ?? x.TicketPrice) >= request.MinBudget.Value
                || (x.PriceMaxUsd ?? x.TicketPrice) >= request.MinBudget.Value);
        }

        if (request.MaxBudget.HasValue)
        {
            query = query.Where(x => (x.PriceMinUsd ?? x.TicketPrice) <= request.MaxBudget.Value);
        }

        if (request.MaxDurationMinutes.HasValue)
        {
            query = query.Where(x => !x.RecommendedDurationMinutes.HasValue || x.RecommendedDurationMinutes.Value <= request.MaxDurationMinutes.Value);
        }

        query = query
            .OrderByDescending(x => x.Score ?? 0)
            .ThenByDescending(x => x.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var pageItems = await query
            .Skip((request.PageIndex - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var locationIds = pageItems.Select(x => x.Id).ToList();

        var reviewCounts = await _context.LocationReviews
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                && x.Status == LocationReviewStatus.Visible
                && locationIds.Contains(x.LocationId))
            .GroupBy(x => x.LocationId)
            .Select(x => new { LocationId = x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.LocationId, x => x.Count, cancellationToken);

        var items = pageItems
            .Select(x => new PublicLocationCardDto(
                x.Id,
                x.Name,
                x.District!.Province!.Name,
                x.District!.Name,
                x.Address,
                x.Description,
                x.Score,
                reviewCounts.GetValueOrDefault(x.Id),
                x.LocationMedias
                    .Where(m => !m.IsDeleted)
                    .OrderBy(m => m.Id)
                    .Select(m => m.Link)
                    .FirstOrDefault(),
                x.LocationType is null ? null : x.LocationType.ToPublicLocationTypeDto(),
                x.LocationTags
                    .Where(tag => !tag.IsDeleted && tag.Tag != null && !tag.Tag.IsDeleted)
                    .Select(tag => tag.Tag!.ToPublicTagDto())
                    .ToList(),
                x.PriceMinUsd,
                x.PriceMaxUsd,
                x.TicketPrice,
                x.RecommendedDurationMinutes,
                x.GetEffectiveStatus().ToString()))
            .ToList();

        return new PublicLocationPagedResponse(items, totalCount, request.PageIndex, request.PageSize);
    }
}
