using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Locations.Queries;

public record GetPublicDestinationsQuery(int Limit = 6)
    : IRequest<ErrorOr<IReadOnlyList<PublicDestinationDto>>>;

public class GetPublicDestinationsQueryValidator : AbstractValidator<GetPublicDestinationsQuery>
{
    public GetPublicDestinationsQueryValidator()
    {
        RuleFor(x => x.Limit).GreaterThan(0);
    }
}

public class GetPublicDestinationsQueryHandler : IRequestHandler<GetPublicDestinationsQuery, ErrorOr<IReadOnlyList<PublicDestinationDto>>>
{
    private readonly IAppDbContext _context;

    public GetPublicDestinationsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ErrorOr<IReadOnlyList<PublicDestinationDto>>> Handle(GetPublicDestinationsQuery request, CancellationToken cancellationToken)
    {
        var destinationsData = await _context.Locations
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                && x.Status == LocationStatus.Active
                && x.District != null
                && x.District.Province != null
                && !x.District.IsDeleted
                && !x.District.Province.IsDeleted)
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
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        return destinationsData
            .Select(x => new PublicDestinationDto(
                x.ProvinceId!.Value,
                x.ProvinceName,
                x.LocationCount))
            .ToList();
    }
}
