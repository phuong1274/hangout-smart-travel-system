using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using HSTS.Application.Auth.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Auth.Commands
{
    public record VerifyEmailCommand(string Email, string OtpCode) : IRequest<ErrorOr<string>>;

    public class VerifyEmailCommandHandler : IRequestHandler<VerifyEmailCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;
        private readonly IEmailDomainPolicy _emailDomainPolicy;

        public VerifyEmailCommandHandler(IAppDbContext context, IEmailDomainPolicy emailDomainPolicy)
        {
            _context = context;
            _emailDomainPolicy = emailDomainPolicy;
        }

        public async Task<ErrorOr<string>> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
        {
            var hasLegacyAccount = await _context.Accounts
                .AnyAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (!hasLegacyAccount && !_emailDomainPolicy.IsAllowedEmail(request.Email))
                return Error.Validation("Email.DomainNotAllowed", "This email domain is not supported.");

            var otp = await _context.Otps
                .Where(o => o.Email == request.Email
                    && o.Code == request.OtpCode
                    && o.Type == OtpType.EmailVerification
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

            account.Status = AccountStatus.Active;
            await _context.SaveChangesAsync(cancellationToken);

            return "Email verified successfully. You can now sign in.";
        }
    }

    public class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
    {
        public VerifyEmailCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.OtpCode).NotEmpty().Length(6);
        }
    }
}
