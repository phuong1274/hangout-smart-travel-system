using ErrorOr;
using FluentValidation;
using HSTS.Application.Dashboard;
using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Dashboard.Queries;

public record GetAdminDashboardInsightsQuery : IRequest<ErrorOr<AdminDashboardInsightsDto>>;

public class GetAdminDashboardInsightsQueryValidator : AbstractValidator<GetAdminDashboardInsightsQuery>
{
}

public class GetAdminDashboardInsightsQueryHandler : IRequestHandler<GetAdminDashboardInsightsQuery, ErrorOr<AdminDashboardInsightsDto>>
{
    private readonly IAppDbContext _context;

    public GetAdminDashboardInsightsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ErrorOr<AdminDashboardInsightsDto>> Handle(GetAdminDashboardInsightsQuery request, CancellationToken cancellationToken)
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);

        var tripsCreatedThisMonth = await _context.Trips
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted && x.CreatedAt >= monthStart && x.CreatedAt < nextMonthStart, cancellationToken);

        var tripsCompletedThisMonth = await _context.Trips
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted
                && x.Status == TripStatus.Completed
                && x.EndDate >= monthStart
                && x.EndDate < nextMonthStart, cancellationToken);

        var locationsAddedThisMonth = await _context.Locations
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted && x.CreatedAt >= monthStart && x.CreatedAt < nextMonthStart, cancellationToken);

        var approvedSubmissionsThisMonth = await _context.LocationSubmissions
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted
                && x.Status == SubmissionStatus.Approved
                && x.ReviewedAt.HasValue
                && x.ReviewedAt.Value >= monthStart
                && x.ReviewedAt.Value < nextMonthStart, cancellationToken);

        var rejectedSubmissionsThisMonth = await _context.LocationSubmissions
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted
                && x.Status == SubmissionStatus.Rejected
                && x.ReviewedAt.HasValue
                && x.ReviewedAt.Value >= monthStart
                && x.ReviewedAt.Value < nextMonthStart, cancellationToken);

        var activeLocationCount = await _context.Locations
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted && x.Status == LocationStatus.Active, cancellationToken);

        var activeLocationIds = await _context.Locations
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.Status == LocationStatus.Active)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        var visibleReviewsForActiveLocations = await _context.LocationReviews
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted
                && x.Status == LocationReviewStatus.Visible
                && activeLocationIds.Contains(x.LocationId), cancellationToken);

        var activeLocationsWithVisibleReviews = await _context.LocationReviews
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                && x.Status == LocationReviewStatus.Visible
                && activeLocationIds.Contains(x.LocationId))
            .Select(x => x.LocationId)
            .Distinct()
            .CountAsync(cancellationToken);

        var locationsWithoutReviews = Math.Max(0, activeLocationCount - activeLocationsWithVisibleReviews);

        var avgReviewsPerActiveLocation = activeLocationCount == 0
            ? 0m
            : Math.Round((decimal)visibleReviewsForActiveLocations / activeLocationCount, 2, MidpointRounding.AwayFromZero);

        var reportsThisMonth = await _context.LocationReviewReports
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted && x.CreatedAt >= monthStart && x.CreatedAt < nextMonthStart, cancellationToken);

        var resolvedReportsThisMonth = await _context.LocationReviewReports
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted
                && x.Status != LocationReviewReportStatus.Pending
                && x.CreatedAt >= monthStart
                && x.CreatedAt < nextMonthStart, cancellationToken);

        var moderationResolutionRate = reportsThisMonth == 0
            ? 0m
            : Math.Round((decimal)resolvedReportsThisMonth * 100 / reportsThisMonth, 2, MidpointRounding.AwayFromZero);

        return new AdminDashboardInsightsDto(
            tripsCreatedThisMonth,
            tripsCompletedThisMonth,
            locationsAddedThisMonth,
            approvedSubmissionsThisMonth,
            rejectedSubmissionsThisMonth,
            avgReviewsPerActiveLocation,
            locationsWithoutReviews,
            moderationResolutionRate);
    }
}
