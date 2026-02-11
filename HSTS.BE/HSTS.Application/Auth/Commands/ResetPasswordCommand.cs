using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using HSTS.Application.Auth.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Auth.Commands
{
    public record ResetPasswordCommand(string Email, string OtpCode, string NewPassword) : IRequest<ErrorOr<string>>;

    public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public ResetPasswordCommandHandler(IAppDbContext context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task<ErrorOr<string>> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
        {
            var otp = await _context.Otps
                .Where(o => o.Email == request.Email
                    && o.Code == request.OtpCode
                    && o.Type == OtpType.ForgotPassword
                    && !o.IsUsed
                    && o.ExpiredAt > DateTime.UtcNow)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (otp is null)
                return Error.Validation("Otp.Invalid", "Invalid or expired OTP code.");

            otp.IsUsed = true;

            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (account is null)
                return Error.NotFound("Account.NotFound", "Account not found.");

            account.PasswordHash = _passwordHasher.Hash(request.NewPassword);

            // Revoke all refresh tokens to force re-login everywhere
            var tokens = await _context.AccountRefreshTokens
                .Where(t => t.AccountId == account.Id && t.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var token in tokens)
                token.RevokedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return "Password reset successfully. Please sign in with your new password.";
        }
    }

    public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
    {
        public ResetPasswordCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.OtpCode).NotEmpty().Length(6);
            RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(128);
        }
    }
}
