using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Queries
{
    public record GetMyInfoQuery() : IRequest<ErrorOr<UserDto>>;

    public class GetMyInfoQueryHandler : IRequestHandler<GetMyInfoQuery, ErrorOr<UserDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public GetMyInfoQueryHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<UserDto>> Handle(GetMyInfoQuery request, CancellationToken cancellationToken)
        {
            var user = await _context.Users
                .Include(u => u.Account)
                .Include(u => u.Profiles.Where(p => !p.IsDeleted))
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId && !u.IsDeleted, cancellationToken);

            if (user is null)
                return Error.NotFound("User.NotFound", "User not found.");

            return user.ToDto(user.Account);
        }
    }
}
