using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Queries
{
    public record GetUserByIdQuery(int UserId) : IRequest<ErrorOr<UserAdminDetailDto>>;

    public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, ErrorOr<UserAdminDetailDto>>
    {
        private readonly IAppDbContext _ctx;

        public GetUserByIdQueryHandler(IAppDbContext ctx) => _ctx = ctx;

        public async Task<ErrorOr<UserAdminDetailDto>> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
        {
            var user = await _ctx.Users
                .Include(u => u.Account)
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

            if (user is null)
                return Error.NotFound("User.NotFound", "User not found.");

            return user.ToAdminDetailDto(user.Account);
        }
    }
}
