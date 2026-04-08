using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Queries
{
    public record UserPagedResponse(IEnumerable<UserListItemDto> Items, int TotalCount, int PageIndex, int PageSize);

    public record GetUsersPagingQuery(int PageIndex = 1, int PageSize = 10, string? SearchTerm = null, string? Role = null, string? Status = null)
        : IRequest<ErrorOr<UserPagedResponse>>;

    public class GetUsersPagingQueryValidator : AbstractValidator<GetUsersPagingQuery>
    {
        public GetUsersPagingQueryValidator()
        {
            RuleFor(x => x.PageIndex).GreaterThan(0);
            RuleFor(x => x.PageSize).GreaterThan(0).LessThanOrEqualTo(100);
        }
    }

    public class GetUsersPagingQueryHandler : IRequestHandler<GetUsersPagingQuery, ErrorOr<UserPagedResponse>>
    {
        private readonly IAppDbContext _ctx;

        public GetUsersPagingQueryHandler(IAppDbContext ctx) => _ctx = ctx;

        public async Task<ErrorOr<UserPagedResponse>> Handle(GetUsersPagingQuery request, CancellationToken cancellationToken)
        {
            var query = _ctx.Users
                .Include(u => u.Account)
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Where(u => !u.IsDeleted && !u.Account.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.Trim().ToLower();
                query = query.Where(u =>
                    u.FullName.ToLower().Contains(term) ||
                    u.Account.Email.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = request.Role.Trim().ToUpper();
                query = query.Where(u => u.UserRoles.Any(ur => ur.Role != null && ur.Role.Name.ToUpper() == role));
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                var status = request.Status.Trim().ToUpper();
                query = query.Where(u => u.Account.Status.ToString().ToUpper() == status);
            }

            var total = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((request.PageIndex - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync(cancellationToken);

            return new UserPagedResponse(
                items.Select(u => u.ToListItemDto(u.Account)).ToList(),
                total,
                request.PageIndex,
                request.PageSize);
        }
    }
}
