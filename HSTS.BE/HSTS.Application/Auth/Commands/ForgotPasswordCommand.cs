using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Auth.Interfaces;

namespace HSTS.Application.Auth.Commands
{
    public record ForgotPasswordCommand(string Email) : IRequest<ErrorOr<string>>;

    public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;
        private readonly IEmailService _emailService;

        public ForgotPasswordCommandHandler(IAppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        public async Task<ErrorOr<string>> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (account is null)
                return Error.NotFound("Account.NotFound", "No account found with this email.");

            if (account.Status == AccountStatus.Banned)
                return Error.Forbidden("Account.Banned", "Your account has been banned.");

            // Invalidate previous forgot password OTPs
            var previousOtps = await _context.Otps
                .Where(o => o.Email == request.Email && o.Type == OtpType.ForgotPassword && !o.IsUsed)
                .ToListAsync(cancellationToken);

            foreach (var old in previousOtps)
                old.IsUsed = true;

            var otpCode = Random.Shared.Next(100000, 999999).ToString();
            var otp = new Otp
            {
                Email = request.Email,
                Code = otpCode,
                Type = OtpType.ForgotPassword,
                ExpiredAt = DateTime.UtcNow.AddMinutes(5)
            };

            _context.Otps.Add(otp);
            await _context.SaveChangesAsync(cancellationToken);

            await _emailService.SendOtpEmailAsync(request.Email, otpCode, OtpType.ForgotPassword, cancellationToken);

            return "OTP sent to your email for password reset.";
        }
    }

    public class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
    {
        public ForgotPasswordCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
        }
    }
}
