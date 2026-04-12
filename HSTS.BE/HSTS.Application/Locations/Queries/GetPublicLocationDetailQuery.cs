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
            .Include(x => x.LocationMedias)
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
            imageUrls);
    }
}
