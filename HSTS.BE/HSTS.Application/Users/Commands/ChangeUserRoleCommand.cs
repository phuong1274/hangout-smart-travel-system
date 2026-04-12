using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Commands
{
    public record ChangeUserRoleCommand(int UserId, int RoleId) : IRequest<ErrorOr<Unit>>;

    public class ChangeUserRoleCommandHandler : IRequestHandler<ChangeUserRoleCommand, ErrorOr<Unit>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;

        public ChangeUserRoleCommandHandler(IAppDbContext ctx, ICurrentUserService currentUser)
        {
            _ctx = ctx;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<Unit>> Handle(ChangeUserRoleCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId == request.UserId)
                return Error.Forbidden("UserRole.SelfChangeForbidden", "Admins cannot change their own role.");

            var user = await _ctx.Users
                .Include(u => u.Account)
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Id == request.UserId && !u.IsDeleted, cancellationToken);
            if (user is null)
                return Error.NotFound("User.NotFound", "User not found.");

            var role = await _ctx.Roles
                .FirstOrDefaultAsync(r => r.Id == request.RoleId && !r.IsDeleted, cancellationToken);
            if (role is null)
                return Error.NotFound("Role.NotFound", "Role not found.");

            user.UserRoles.Clear();
            user.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                Role = role,
                User = user
            });

            var now = DateTime.UtcNow;
            var activeTokens = await _ctx.AccountRefreshTokens
                .Where(t => t.AccountId == user.AccountId && t.RevokedAt == null && t.ExpiredAt > now)
                .ToListAsync(cancellationToken);

            foreach (var token in activeTokens)
            {
                token.RevokedAt = now;
            }

            await _ctx.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }

    public class ChangeUserRoleCommandValidator : AbstractValidator<ChangeUserRoleCommand>
    {
        public ChangeUserRoleCommandValidator()
        {
            RuleFor(x => x.UserId).GreaterThan(0);
            RuleFor(x => x.RoleId).GreaterThan(0);
        }
    }
}
