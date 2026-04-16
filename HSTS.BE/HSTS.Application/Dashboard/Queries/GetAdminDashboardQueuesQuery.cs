using ErrorOr;
using FluentValidation;
using HSTS.Application.Dashboard;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Dashboard.Queries;

public record GetAdminDashboardQueuesQuery(int SubmissionLimit = 5, int ReviewLimit = 5) : IRequest<ErrorOr<AdminDashboardQueuesDto>>;

public class GetAdminDashboardQueuesQueryValidator : AbstractValidator<GetAdminDashboardQueuesQuery>
{
    public GetAdminDashboardQueuesQueryValidator()
    {
        RuleFor(x => x.SubmissionLimit).GreaterThan(0).LessThanOrEqualTo(100);
        RuleFor(x => x.ReviewLimit).GreaterThan(0).LessThanOrEqualTo(100);
    }
}

public class GetAdminDashboardQueuesQueryHandler : IRequestHandler<GetAdminDashboardQueuesQuery, ErrorOr<AdminDashboardQueuesDto>>
{
    private readonly IAppDbContext _context;

    public GetAdminDashboardQueuesQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<ErrorOr<AdminDashboardQueuesDto>> Handle(GetAdminDashboardQueuesQuery request, CancellationToken cancellationToken)
    {
        var pendingSubmissions = await _context.LocationSubmissions
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.Status == SubmissionStatus.Pending)
            .OrderByDescending(x => x.CreatedAt)
            .Take(request.SubmissionLimit)
            .Select(x => new AdminDashboardQueueSubmissionDto(
                x.Id,
                x.Name,
                (int)x.SubmissionType,
                x.CreatedAt,
                (int)x.Status))
            .ToListAsync(cancellationToken);

        var pendingReviewReports = await _context.LocationReviews
            .AsNoTracking()
            .Include(x => x.Location)
            .Include(x => x.User)
                .ThenInclude(x => x.Account)
            .Where(x => !x.IsDeleted && (x.ReportCount > 0 || x.Status == Domain.Enums.LocationReviewStatus.Hidden))
            .OrderByDescending(x => x.ReportCount)
            .ThenByDescending(x => x.UpdatedAt)
            .Take(request.ReviewLimit)
            .Select(x => new AdminDashboardQueueReviewDto(
                x.Id,
                x.Location!.Name,
                x.User!.Account!.Email,
                x.ReportCount,
                x.Status.ToString(),
                x.UpdatedAt!.Value))
            .ToListAsync(cancellationToken);

        return new AdminDashboardQueuesDto(pendingSubmissions, pendingReviewReports);
    }
}
