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
        var totalUsers = await _context.Users.AsNoTracking().CountAsync(x => !x.IsDeleted, cancellationToken);
        var activeAccounts = await _context.Accounts.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == AccountStatus.Active, cancellationToken);
        var totalTrips = await _context.Trips.AsNoTracking().CountAsync(x => !x.IsDeleted, cancellationToken);
        var completedTrips = await _context.Trips.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == TripStatus.Completed, cancellationToken);
        var activeLocations = await _context.Locations.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == LocationStatus.Active, cancellationToken);

        var coveredDestinations = await _context.Locations
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

        var visibleReviews = await _context.LocationReviews.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == LocationReviewStatus.Visible, cancellationToken);
        var pendingLocationSubmissions = await _context.LocationSubmissions.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == SubmissionStatus.Pending, cancellationToken);
        var pendingReviewReports = await _context.LocationReviewReports.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == LocationReviewReportStatus.Pending, cancellationToken);
        var hiddenReviews = await _context.LocationReviews.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == LocationReviewStatus.Hidden, cancellationToken);

        return new AdminDashboardSummaryDto(
            totalUsers,
            activeAccounts,
            totalTrips,
            completedTrips,
            activeLocations,
            coveredDestinations,
            visibleReviews,
            pendingLocationSubmissions,
            pendingReviewReports,
            hiddenReviews);
    }
}
