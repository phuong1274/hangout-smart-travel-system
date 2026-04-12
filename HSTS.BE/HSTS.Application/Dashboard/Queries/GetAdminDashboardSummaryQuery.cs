using ErrorOr;
using FluentValidation;
using HSTS.Application.Dashboard;
using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Dashboard.Queries;

public record GetAdminDashboardSummaryQuery : IRequest<ErrorOr<AdminDashboardSummaryDto>>;

public class GetAdminDashboardSummaryQueryValidator : AbstractValidator<GetAdminDashboardSummaryQuery>
{
}

public class GetAdminDashboardSummaryQueryHandler : IRequestHandler<GetAdminDashboardSummaryQuery, ErrorOr<AdminDashboardSummaryDto>>
{
    private readonly IAppDbContext _context;

    public GetAdminDashboardSummaryQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ErrorOr<AdminDashboardSummaryDto>> Handle(GetAdminDashboardSummaryQuery request, CancellationToken cancellationToken)
    {
        var totalDestinations = await _context.Locations
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                && x.Status == LocationStatus.Active
                && x.District != null
                && x.District.Province != null
                && !x.District.IsDeleted
                && !x.District.Province.IsDeleted)
            .Select(x => x.District!.ProvinceId)
            .Distinct()
            .CountAsync(cancellationToken);

        var totalProvinces = await _context.Provinces.AsNoTracking().CountAsync(x => !x.IsDeleted, cancellationToken);
        var totalLocations = await _context.Locations.AsNoTracking().CountAsync(x => !x.IsDeleted, cancellationToken);
        var totalReviews = await _context.LocationReviews.AsNoTracking().CountAsync(x => !x.IsDeleted, cancellationToken);
        var totalItinerariesCreated = await _context.Trips.AsNoTracking().CountAsync(x => !x.IsDeleted, cancellationToken);
        var totalItinerariesCompleted = await _context.Trips.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == TripStatus.Completed, cancellationToken);

        return new AdminDashboardSummaryDto(
            totalDestinations,
            totalProvinces,
            totalLocations,
            totalReviews,
            totalItinerariesCreated,
            totalItinerariesCompleted);
    }
}
