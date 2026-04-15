using ErrorOr;
using FluentValidation;
using HSTS.Application.Dashboard;
using HSTS.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Dashboard.Queries;

public record GetAdminDashboardTrendsQuery(int Months = 6) : IRequest<ErrorOr<AdminDashboardTrendDto>>;

public class GetAdminDashboardTrendsQueryValidator : AbstractValidator<GetAdminDashboardTrendsQuery>
{
    public GetAdminDashboardTrendsQueryValidator()
    {
        RuleFor(x => x.Months).InclusiveBetween(1, 24);
    }
}

public class GetAdminDashboardTrendsQueryHandler : IRequestHandler<GetAdminDashboardTrendsQuery, ErrorOr<AdminDashboardTrendDto>>
{
    private readonly IAppDbContext _context;

    public GetAdminDashboardTrendsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ErrorOr<AdminDashboardTrendDto>> Handle(GetAdminDashboardTrendsQuery request, CancellationToken cancellationToken)
    {
        var startMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-(request.Months - 1));
        var endMonth = startMonth.AddMonths(request.Months);

        var locationRaw = await _context.Locations
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.CreatedAt >= startMonth && x.CreatedAt < endMonth)
            .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month })
            .Select(x => new { x.Key.Year, x.Key.Month, Value = x.Count() })
            .ToListAsync(cancellationToken);

        var reviewRaw = await _context.LocationReviews
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.CreatedAt >= startMonth && x.CreatedAt < endMonth)
            .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month })
            .Select(x => new { x.Key.Year, x.Key.Month, Value = x.Count() })
            .ToListAsync(cancellationToken);

        var tripRaw = await _context.Trips
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.CreatedAt >= startMonth && x.CreatedAt < endMonth)
            .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month })
            .Select(x => new { x.Key.Year, x.Key.Month, Value = x.Count() })
            .ToListAsync(cancellationToken);

        var locationGrowth = BuildSeries(startMonth, request.Months, locationRaw.Select(x => (x.Year, x.Month, x.Value)));
        var reviewGrowth = BuildSeries(startMonth, request.Months, reviewRaw.Select(x => (x.Year, x.Month, x.Value)));
        var tripGrowth = BuildSeries(startMonth, request.Months, tripRaw.Select(x => (x.Year, x.Month, x.Value)));

        return new AdminDashboardTrendDto(locationGrowth, reviewGrowth, tripGrowth);
    }

    private static IReadOnlyList<DashboardTrendPointDto> BuildSeries(DateTime startMonth, int months, IEnumerable<(int Year, int Month, int Value)> source)
    {
        var lookup = source.ToDictionary(x => (x.Year, x.Month), x => x.Value);
        var result = new List<DashboardTrendPointDto>(months);

        for (var i = 0; i < months; i++)
        {
            var monthDate = startMonth.AddMonths(i);
            var label = monthDate.ToString("MM/yyyy");
            var value = lookup.GetValueOrDefault((monthDate.Year, monthDate.Month), 0);
            result.Add(new DashboardTrendPointDto(label, value));
        }

        return result;
    }
}
