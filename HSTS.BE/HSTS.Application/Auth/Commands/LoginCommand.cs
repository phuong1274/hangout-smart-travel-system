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
        private const int MaxOtpSends = 4;
        private const int CooldownSeconds = 60;
        private const int RateLimitWindowMinutes = 15;

        private readonly IAppDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IEmailService _emailService;

        public LoginCommandHandler(
            IAppDbContext context,
            IJwtService jwtService,
            IPasswordHasher passwordHasher,
            IEmailService emailService)
        {
            _context = context;
            _jwtService = jwtService;
            _passwordHasher = passwordHasher;
            _emailService = emailService;
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
            {
                var otpSent = await TrySendVerificationOtp(request.Email, cancellationToken);
                var message = otpSent
                    ? "Email not verified. A new verification code has been sent to your email."
                    : "Email not verified. Please check your inbox for the verification code.";
                return Error.Forbidden("Account.EmailNotVerified", message);
            }

            if (account.Status == AccountStatus.Banned)
                return Error.Forbidden("Auth.Banned", "Your account has been banned.");

            var user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.AccountId == account.Id, cancellationToken);
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

        private async Task<bool> TrySendVerificationOtp(string email, CancellationToken cancellationToken)
        {
            var otpType = OtpType.EmailVerification;

            // If a valid (unexpired, unused) OTP already exists, don't invalidate it — let user use it
            var hasValidOtp = await _context.Otps
                .AnyAsync(o => o.Email == email && o.Type == otpType && !o.IsUsed && o.ExpiredAt > DateTime.UtcNow, cancellationToken);

            if (hasValidOtp)
                return false;

            // Rate limit check
            var windowStart = DateTime.UtcNow.AddMinutes(-RateLimitWindowMinutes);
            var recentOtpCount = await _context.Otps
                .CountAsync(o => o.Email == email && o.Type == otpType && o.CreatedAt > windowStart, cancellationToken);

            if (recentOtpCount >= MaxOtpSends)
                return false;

            // Cooldown check
            var lastOtp = await _context.Otps
                .Where(o => o.Email == email && o.Type == otpType)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (lastOtp is not null && (DateTime.UtcNow - lastOtp.CreatedAt).TotalSeconds < CooldownSeconds)
                return false;

            // Invalidate previous OTPs
            var previousOtps = await _context.Otps
                .Where(o => o.Email == email && o.Type == otpType && !o.IsUsed)
                .ToListAsync(cancellationToken);

            foreach (var old in previousOtps)
                old.IsUsed = true;

            var otpCode = Random.Shared.Next(100000, 999999).ToString();
            var otp = new Otp
            {
                Email = email,
                Code = otpCode,
                Type = otpType,
                ExpiredAt = DateTime.UtcNow.AddMinutes(5)
            };

            _context.Otps.Add(otp);
            await _context.SaveChangesAsync(cancellationToken);

            await _emailService.SendOtpEmailAsync(email, otpCode, otpType, cancellationToken);

            return true;
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
