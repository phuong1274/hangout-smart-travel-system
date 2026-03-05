using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using HSTS.Application.Auth.Common;
using HSTS.Application.Auth.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Auth.Commands
{
    public record ForgotPasswordCommand(string Email) : IRequest<ErrorOr<OtpSendResult>>;

    public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, ErrorOr<OtpSendResult>>
    {
        private const int MaxOtpSends = 4;
        private const int CooldownSeconds = 60;
        private const int RateLimitWindowMinutes = 15;

        private readonly IAppDbContext _context;
        private readonly IEmailService _emailService;

        public ForgotPasswordCommandHandler(IAppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        public async Task<ErrorOr<OtpSendResult>> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (account is null)
                return Error.NotFound("Account.NotFound", "No account found with this email.");

            if (account.Status == AccountStatus.Banned)
                return Error.Forbidden("Account.Banned", "Your account has been banned.");

            var otpType = OtpType.ForgotPassword;

            // Rate limit: count OTPs sent in the last 15 minutes
            var windowStart = DateTime.UtcNow.AddMinutes(-RateLimitWindowMinutes);
            var recentOtpCount = await _context.Otps
                .CountAsync(o => o.Email == request.Email && o.Type == otpType && o.CreatedAt > windowStart, cancellationToken);

            if (recentOtpCount >= MaxOtpSends)
                return Error.Conflict("Otp.TooManyRequests", "Too many OTP requests. Please try again later.");

            // Cooldown: check if the most recent OTP was sent less than 60 seconds ago
            var lastOtp = await _context.Otps
                .Where(o => o.Email == request.Email && o.Type == otpType)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (lastOtp is not null)
            {
                var secondsSinceLast = (DateTime.UtcNow - lastOtp.CreatedAt).TotalSeconds;
                if (secondsSinceLast < CooldownSeconds)
                {
                    var remaining = (int)Math.Ceiling(CooldownSeconds - secondsSinceLast);
                    return Error.Conflict("Otp.CooldownActive", $"Please wait {remaining} seconds before requesting a new OTP.");
                }
            }

            // Invalidate previous forgot password OTPs
            var previousOtps = await _context.Otps
                .Where(o => o.Email == request.Email && o.Type == otpType && !o.IsUsed)
                .ToListAsync(cancellationToken);

            foreach (var old in previousOtps)
                old.IsUsed = true;

            var otpCode = Random.Shared.Next(100000, 999999).ToString();
            var otp = new Otp
            {
                Email = request.Email,
                Code = otpCode,
                Type = otpType,
                ExpiredAt = DateTime.UtcNow.AddMinutes(5)
            };

            _context.Otps.Add(otp);
            await _context.SaveChangesAsync(cancellationToken);

            await _emailService.SendOtpEmailAsync(request.Email, otpCode, otpType, cancellationToken);

            var remainingResends = MaxOtpSends - recentOtpCount - 1;

            return new OtpSendResult("OTP sent to your email for password reset.", remainingResends, CooldownSeconds);
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
