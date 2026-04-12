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
        var destinations = await _context.Locations
            .AsNoTracking()
            .Include(x => x.District)
            .ThenInclude(x => x!.Province)
            .Where(x => !x.IsDeleted
                && x.Status == LocationStatus.Active
                && x.District != null
                && x.District.Province != null
                && !x.District.IsDeleted
                && !x.District.Province.IsDeleted)
            .GroupBy(x => new
            {
                x.District!.Province!.Id,
                x.District.Province.Name
            })
            .Select(x => new PublicDestinationDto(
                x.Key.Id,
                x.Key.Name,
                x.Count()))
            .OrderByDescending(x => x.LocationCount)
            .ThenBy(x => x.Name)
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        return destinations;
    }
}
