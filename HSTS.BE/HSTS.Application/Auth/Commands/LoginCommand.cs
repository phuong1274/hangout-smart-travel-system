using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Auth.Common;
using HSTS.Application.Auth.Interfaces;

namespace HSTS.Application.Auth.Commands
{
    public record LoginCommand(string Email, string Password) : IRequest<ErrorOr<AuthResult>>;

    public class LoginCommandHandler : IRequestHandler<LoginCommand, ErrorOr<AuthResult>>
    {
        private readonly IAppDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IPasswordHasher _passwordHasher;

        public LoginCommandHandler(IAppDbContext context, IJwtService jwtService, IPasswordHasher passwordHasher)
        {
            _context = context;
            _jwtService = jwtService;
            _passwordHasher = passwordHasher;
        }

        public async Task<ErrorOr<AuthResult>> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (account is null)
                return Error.NotFound("Auth.InvalidCredentials", "Invalid email or password.");

            if (account.PasswordHash is null)
                return Error.Validation("Auth.NoPassword", "This account uses Google sign-in. Please use Google to log in.");

            if (!_passwordHasher.Verify(request.Password, account.PasswordHash))
                return Error.NotFound("Auth.InvalidCredentials", "Invalid email or password.");

            if (account.Status == AccountStatus.PendingVerification)
                return Error.Validation("Auth.NotVerified", "Please verify your email before signing in.");

            if (account.Status == AccountStatus.Banned)
                return Error.Forbidden("Auth.Banned", "Your account has been banned.");

            var user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstAsync(u => u.AccountId == account.Id, cancellationToken);

            var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            var accessToken = _jwtService.GenerateAccessToken(account, user, roles);
            var refreshToken = _jwtService.GenerateRefreshToken();
            var refreshTokenExpiry = DateTime.UtcNow.AddDays(7);

            _context.AccountRefreshTokens.Add(new AccountRefreshToken
            {
                AccountId = account.Id,
                Token = refreshToken,
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
                RefreshToken: refreshToken,
                RefreshTokenExpiry: refreshTokenExpiry);
        }
    }

    public class LoginCommandValidator : AbstractValidator<LoginCommand>
    {
        public LoginCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.Password).NotEmpty();
        }
    }
}
