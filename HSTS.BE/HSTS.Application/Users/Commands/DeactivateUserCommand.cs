using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Common.LoggingInterfaces;

namespace HSTS.Application.Users.Commands
{
    public record DeactivateUserCommand(int UserId) : IRequest<ErrorOr<Unit>>;

    public class DeactivateUserCommandHandler : IRequestHandler<DeactivateUserCommand, ErrorOr<Unit>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ICurrentUserService _currentUser;
        private readonly ILoggingService _loggingService;

        public DeactivateUserCommandHandler(IAppDbContext ctx, ICurrentUserService currentUser, ILoggingService loggingService)
        {
            _ctx = ctx;
            _currentUser = currentUser;
            _loggingService = loggingService;
        }

        public async Task<ErrorOr<Unit>> Handle(DeactivateUserCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId == request.UserId)
                return Error.Forbidden("User.DeactivateSelfForbidden", "Admins cannot deactivate their own account.");

            var user = await _ctx.Users
                .Include(u => u.Account)
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == request.UserId && !u.IsDeleted, cancellationToken);

            if (user is null)
                return Error.NotFound("User.NotFound", "User not found.");

            var isLastAdmin = user.UserRoles.Any(ur => ur.Role.Name == "ADMIN")
                && !await _ctx.Users
                    .Include(u => u.Account)
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .AnyAsync(u => u.Id != user.Id
                        && !u.IsDeleted
                        && !u.Account.IsDeleted
                        && u.Account.Status != HSTS.Domain.Enums.AccountStatus.Banned
                        && u.UserRoles.Any(ur => ur.Role.Name == "ADMIN"), cancellationToken);

            if (isLastAdmin)
                return Error.Conflict("User.LastAdminDeactivateForbidden", "Cannot deactivate the last active admin.");

            user.IsDeleted = true;
            user.Account.IsDeleted = true;
            await RevokeRefreshTokens(user.AccountId, cancellationToken);
            await _ctx.SaveChangesAsync(cancellationToken);
            await TryLogActivityAsync($"Admin deactivated user {user.Account.Email}.");

            return Unit.Value;
        }

        private async Task RevokeRefreshTokens(int accountId, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            var tokens = await _ctx.AccountRefreshTokens
                .Where(t => t.AccountId == accountId && t.RevokedAt == null && t.ExpiredAt > now)
                .ToListAsync(cancellationToken);

            foreach (var token in tokens)
                token.RevokedAt = now;
        }

        private async Task TryLogActivityAsync(string message)
        {
            try
            {
                await _loggingService.LogActivityAsync(message);
            }
            catch
            {
            }
        }
    }

    public class DeactivateUserCommandValidator : AbstractValidator<DeactivateUserCommand>
    {
        public DeactivateUserCommandValidator()
        {
            RuleFor(x => x.UserId).GreaterThan(0);
        }
    }
}
