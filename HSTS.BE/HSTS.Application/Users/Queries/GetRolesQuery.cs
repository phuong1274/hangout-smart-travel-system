using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Queries
{
    public record GetRolesQuery() : IRequest<ErrorOr<IList<RoleOptionDto>>>;

    public class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, ErrorOr<IList<RoleOptionDto>>>
    {
        private readonly IAppDbContext _ctx;

        public GetRolesQueryHandler(IAppDbContext ctx) => _ctx = ctx;

        public async Task<ErrorOr<IList<RoleOptionDto>>> Handle(GetRolesQuery request, CancellationToken cancellationToken)
        {
            var roles = await _ctx.Roles
                .Where(r => !r.IsDeleted)
                .OrderBy(r => r.Name)
                .ToListAsync(cancellationToken);

            return roles.Select(r => r.ToRoleOptionDto()).ToList();
        }
    }
}
