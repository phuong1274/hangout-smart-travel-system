using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Auth.Common;
using HSTS.Application.Auth.Interfaces;

namespace HSTS.Application.Auth.Commands
{
    public record GoogleLoginCommand(string GoogleIdToken) : IRequest<ErrorOr<AuthResult>>;

    public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, ErrorOr<AuthResult>>
    {
        private readonly IAppDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IGoogleAuthService _googleAuthService;

        public GoogleLoginCommandHandler(
            IAppDbContext context,
            IJwtService jwtService,
            IGoogleAuthService googleAuthService)
        {
            _context = context;
            _jwtService = jwtService;
            _googleAuthService = googleAuthService;
        }

        public async Task<ErrorOr<AuthResult>> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
        {
            var googleUser = await _googleAuthService.VerifyGoogleTokenAsync(request.GoogleIdToken, cancellationToken);

            if (googleUser is null)
                return Error.Validation("Auth.InvalidGoogleToken", "Invalid Google ID token.");

            // Try find by GoogleId first, then by email
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.GoogleId == googleUser.GoogleId && !a.IsDeleted, cancellationToken)
                ?? await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Email == googleUser.Email && !a.IsDeleted, cancellationToken);

            User user;

            if (account is null)
            {
                // New user — create Account + User + Profile + assign TRAVELER role
                var travelerRole = await _context.Roles
                    .FirstOrDefaultAsync(r => r.Name == "TRAVELER", cancellationToken);
                if (travelerRole is null)
                    return Error.Failure("Role.NotFound", "Default role not found. Please contact support.");

                account = new Account
                {
                    Email = googleUser.Email,
                    GoogleId = googleUser.GoogleId,
                    Status = AccountStatus.Active
                };

                _context.Accounts.Add(account);

                user = new User
                {
                    AccountId = account.Id,
                    FullName = googleUser.Name
                };

                _context.Users.Add(user);

                _context.Profiles.Add(new Profile
                {
                    UserId = user.Id,
                    ProfileName = "Default"
                });

                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = travelerRole.Id });
                await _context.SaveChangesAsync(cancellationToken);
            }
            else
            {
                // Existing account — link Google if not already linked
                if (account.GoogleId is null)
                {
                    account.GoogleId = googleUser.GoogleId;
                }

                if (account.Status == AccountStatus.PendingVerification)
                {
                    account.Status = AccountStatus.Active;
                }

                if (account.Status == AccountStatus.Banned)
                    return Error.Forbidden("Auth.Banned", "Your account has been banned.");

                user = await _context.Users
                    .FirstOrDefaultAsync(u => u.AccountId == account.Id, cancellationToken);
                if (user is null)
                    return Error.NotFound("User.NotFound", "User account is incomplete.");
            }

            // Load roles
            user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == user.Id, cancellationToken);
            if (user is null)
                return Error.NotFound("User.NotFound", "User account is incomplete.");

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

    public class GoogleLoginCommandValidator : AbstractValidator<GoogleLoginCommand>
    {
        public GoogleLoginCommandValidator()
        {
            RuleFor(x => x.GoogleIdToken).NotEmpty();
        }
    }
}
