using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using HSTS.Application.Auth.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Auth.Commands
{
    public record VerifyForgotPasswordOtpCommand(string Email, string OtpCode) : IRequest<ErrorOr<string>>;

    public class VerifyForgotPasswordOtpCommandHandler : IRequestHandler<VerifyForgotPasswordOtpCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;
        private readonly IEmailDomainPolicy _emailDomainPolicy;

        public VerifyForgotPasswordOtpCommandHandler(IAppDbContext context, IEmailDomainPolicy emailDomainPolicy)
        {
            _context = context;
            _emailDomainPolicy = emailDomainPolicy;
        }

        public async Task<ErrorOr<string>> Handle(VerifyForgotPasswordOtpCommand request, CancellationToken cancellationToken)
        {
            var hasLegacyAccount = await _context.Accounts
                .AnyAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (!hasLegacyAccount && !_emailDomainPolicy.IsAllowedEmail(request.Email))
                return Error.Validation("Email.DomainNotAllowed", "This email domain is not supported.");

            // Validate without consuming — reset-password will mark IsUsed when password is actually changed
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

            return "OTP verified successfully.";
        }
    }

    public class VerifyForgotPasswordOtpCommandValidator : AbstractValidator<VerifyForgotPasswordOtpCommand>
    {
        public VerifyForgotPasswordOtpCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.OtpCode).NotEmpty().Length(6);
        }
    }
}
