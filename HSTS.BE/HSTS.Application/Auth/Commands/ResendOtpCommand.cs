using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Auth.Interfaces;

namespace HSTS.Application.Auth.Commands
{
    public record ResendOtpCommand(string Email) : IRequest<ErrorOr<string>>;

    public class ResendOtpCommandHandler : IRequestHandler<ResendOtpCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;
        private readonly IEmailService _emailService;

        public ResendOtpCommandHandler(IAppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        public async Task<ErrorOr<string>> Handle(ResendOtpCommand request, CancellationToken cancellationToken)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (account is null)
                return Error.NotFound("Account.NotFound", "Account not found.");

            if (account.Status != AccountStatus.PendingVerification)
                return Error.Validation("Account.AlreadyVerified", "Account is already verified.");

            // Invalidate previous OTPs
            var previousOtps = await _context.Otps
                .Where(o => o.Email == request.Email && o.Type == OtpType.EmailVerification && !o.IsUsed)
                .ToListAsync(cancellationToken);

            foreach (var old in previousOtps)
                old.IsUsed = true;

            var otpCode = Random.Shared.Next(100000, 999999).ToString();
            var otp = new Otp
            {
                Email = request.Email,
                Code = otpCode,
                Type = OtpType.EmailVerification,
                ExpiredAt = DateTime.UtcNow.AddMinutes(5)
            };

            _context.Otps.Add(otp);
            await _context.SaveChangesAsync(cancellationToken);

            await _emailService.SendOtpEmailAsync(request.Email, otpCode, OtpType.EmailVerification, cancellationToken);

            return "New OTP sent to your email.";
        }
    }

    public class ResendOtpCommandValidator : AbstractValidator<ResendOtpCommand>
    {
        public ResendOtpCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
        }
    }
}
