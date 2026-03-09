using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Auth.Common;
using HSTS.Application.Auth.Interfaces;

namespace HSTS.Application.Auth.Commands
{
    public record RefreshTokenCommand(string RefreshToken) : IRequest<ErrorOr<AuthResult>>;

    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, ErrorOr<AuthResult>>
    {
        private readonly IAppDbContext _context;
        private readonly IJwtService _jwtService;

        public RefreshTokenCommandHandler(IAppDbContext context, IJwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        public async Task<ErrorOr<AuthResult>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        {
            var storedToken = await _context.AccountRefreshTokens
                .Include(t => t.Account)
                .FirstOrDefaultAsync(t => t.Token == request.RefreshToken && t.RevokedAt == null, cancellationToken);

            if (storedToken is null || storedToken.ExpiredAt < DateTime.UtcNow)
                return Error.Unauthorized("Auth.InvalidRefreshToken", "Invalid or expired refresh token.");

            if (storedToken.Account.IsDeleted || storedToken.Account.Status == Domain.Enums.AccountStatus.Banned)
                return Error.Forbidden("Auth.AccountInactive", "Account is not active.");

            // Revoke old token
            storedToken.RevokedAt = DateTime.UtcNow;

            var user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.AccountId == storedToken.AccountId, cancellationToken);
            if (user is null)
                return Error.NotFound("User.NotFound", "User account is incomplete.");

            var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
            var account = storedToken.Account;

            var accessToken = _jwtService.GenerateAccessToken(account, user, roles);
            var newRefreshToken = _jwtService.GenerateRefreshToken();
            var refreshTokenExpiry = DateTime.UtcNow.AddDays(7);

            _context.AccountRefreshTokens.Add(new AccountRefreshToken
            {
                AccountId = account.Id,
                Token = newRefreshToken,
                ExpiredAt = refreshTokenExpiry
            });

            await _context.SaveChangesAsync(cancellationToken);

            return new AuthResult(
                UserId: user.Id,
                FullName: user.FullName,
                Email: account.Email,
                Roles: roles,
                HasPassword: account.PasswordHash != null,
                HasGoogleLinked: account.GoogleId != null,
                AccessToken: accessToken,
                RefreshToken: newRefreshToken,
                RefreshTokenExpiry: refreshTokenExpiry);
        }
    }

    public class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
    {
        public RefreshTokenCommandValidator()
        {
            RuleFor(x => x.RefreshToken).NotEmpty();
        }
    }
}
