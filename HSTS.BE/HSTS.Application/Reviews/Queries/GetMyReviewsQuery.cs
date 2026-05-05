using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Reviews.Queries
{
    public record GetMyReviewsQuery(
        int PageIndex = 1,
        int PageSize = 10,
        string? SearchTerm = null,
        int? Rating = null,
        LocationReviewStatus? Status = null,
        string? SortBy = null,
        string? SortDirection = null) : IRequest<ErrorOr<MyReviewPagedResponse>>;

    public class GetMyReviewsQueryHandler : IRequestHandler<GetMyReviewsQuery, ErrorOr<MyReviewPagedResponse>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public GetMyReviewsQueryHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<MyReviewPagedResponse>> Handle(GetMyReviewsQuery request, CancellationToken cancellationToken)
        {
            var query = _ctx.LocationReviews
                .Include(r => r.Location).ThenInclude(l => l.LocationType)
                .Include(r => r.Location).ThenInclude(l => l.District)
                .Where(r => !r.IsDeleted
                    && r.UserId == _currentUser.UserId
                    && r.Status != LocationReviewStatus.Deleted);

            query = ApplyFilters(query, request);
            query = ApplySorting(query, request);

            var total = await query.CountAsync(cancellationToken);
            var items = await query
                .Skip((request.PageIndex - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(r => new MyReviewDto(
                    r.Id,
                    r.LocationId,
                    r.Location.Name,
                    r.Location.Address,
                    r.Location.LocationType != null ? r.Location.LocationType.Name : string.Empty,
                    r.Location.District != null ? r.Location.District.Name : string.Empty,
                    r.Rating,
                    r.Comment,
                    r.Status,
                    r.ReportCount,
                    r.CreatedAt,
                    r.UpdatedAt))
                .ToListAsync(cancellationToken);

            return new MyReviewPagedResponse(items, total);
        }

        private static IQueryable<LocationReview> ApplyFilters(IQueryable<LocationReview> query, GetMyReviewsQuery request)
        {
            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.Trim();
                query = query.Where(r =>
                    r.Comment.Contains(term)
                    || r.Location.Name.Contains(term)
                    || r.Location.Address.Contains(term));
            }

            if (request.Rating.HasValue)
                query = query.Where(r => r.Rating == request.Rating.Value);

            if (request.Status.HasValue)
                query = query.Where(r => r.Status == request.Status.Value);

            return query;
        }

        private static IQueryable<LocationReview> ApplySorting(IQueryable<LocationReview> query, GetMyReviewsQuery request)
        {
            var descending = !string.Equals(request.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);

            return request.SortBy?.Trim().ToLowerInvariant() switch
            {
                "rating" => descending
                    ? query.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedAt)
                    : query.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedAt),
                "locationname" => descending
                    ? query.OrderByDescending(r => r.Location.Name).ThenByDescending(r => r.CreatedAt)
                    : query.OrderBy(r => r.Location.Name).ThenByDescending(r => r.CreatedAt),
                "updatedat" => descending
                    ? query.OrderByDescending(r => r.UpdatedAt).ThenByDescending(r => r.CreatedAt)
                    : query.OrderBy(r => r.UpdatedAt).ThenByDescending(r => r.CreatedAt),
                _ => descending
                    ? query.OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
                    : query.OrderBy(r => r.CreatedAt).ThenByDescending(r => r.Id)
            };
        }
    }

    public class GetMyReviewsQueryValidator : AbstractValidator<GetMyReviewsQuery>
    {
        public GetMyReviewsQueryValidator()
        {
            RuleFor(x => x.PageIndex).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
            RuleFor(x => x.Rating).InclusiveBetween(1, 5).When(x => x.Rating.HasValue);
            RuleFor(x => x.SortDirection)
                .Must(value => value is null
                    || string.Equals(value, "asc", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(value, "desc", StringComparison.OrdinalIgnoreCase))
                .WithMessage("SortDirection must be 'asc' or 'desc'.");
        }
    }
}
