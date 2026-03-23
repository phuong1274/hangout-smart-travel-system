using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using HSTS.Application.Auth.Common;
using HSTS.Application.Auth.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Auth.Commands
{
    public record ResendOtpCommand(string Email, OtpType Type) : IRequest<ErrorOr<OtpSendResult>>;

    public class ResendOtpCommandHandler : IRequestHandler<ResendOtpCommand, ErrorOr<OtpSendResult>>
    {
        private const int MaxOtpSends = 4;
        private const int CooldownSeconds = 60;
        private const int RateLimitWindowMinutes = 15;

        private readonly IAppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IEmailDomainPolicy _emailDomainPolicy;

        public ResendOtpCommandHandler(IAppDbContext context, IEmailService emailService, IEmailDomainPolicy emailDomainPolicy)
        {
            _context = context;
            _emailService = emailService;
            _emailDomainPolicy = emailDomainPolicy;
        }

        public async Task<ErrorOr<OtpSendResult>> Handle(ResendOtpCommand request, CancellationToken cancellationToken)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (account is null && !_emailDomainPolicy.IsAllowedEmail(request.Email))
                return Error.Validation("Email.DomainNotAllowed", "This email domain is not supported.");

            if (account is null)
                return Error.NotFound("Account.NotFound", "Account not found.");

            if (request.Type == OtpType.EmailVerification && account.Status != AccountStatus.PendingVerification)
                return Error.Validation("Account.AlreadyVerified", "Account is already verified.");

            if (account.Status == AccountStatus.Banned)
                return Error.Forbidden("Account.Banned", "Your account has been banned.");

            // Rate limit: count OTPs sent in the last 15 minutes
            var windowStart = DateTime.UtcNow.AddMinutes(-RateLimitWindowMinutes);
            var recentOtpCount = await _context.Otps
                .CountAsync(o => o.Email == request.Email && o.Type == request.Type && o.CreatedAt > windowStart, cancellationToken);

            if (recentOtpCount >= MaxOtpSends)
                return Error.Conflict("Otp.TooManyRequests", "Too many OTP requests. Please try again later.");

            // Cooldown: check if the most recent OTP was sent less than 60 seconds ago
            var lastOtp = await _context.Otps
                .Where(o => o.Email == request.Email && o.Type == request.Type)
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

            // Invalidate previous OTPs
            var previousOtps = await _context.Otps
                .Where(o => o.Email == request.Email && o.Type == request.Type && !o.IsUsed)
                .ToListAsync(cancellationToken);

            foreach (var old in previousOtps)
                old.IsUsed = true;

            var otpCode = Random.Shared.Next(100000, 999999).ToString();
            var otp = new Otp
            {
                Email = request.Email,
                Code = otpCode,
                Type = request.Type,
                ExpiredAt = DateTime.UtcNow.AddMinutes(5)
            };

            _context.Otps.Add(otp);
            await _context.SaveChangesAsync(cancellationToken);

            try
            {
                await _emailService.SendOtpEmailAsync(request.Email, otpCode, request.Type, cancellationToken);
            }
            catch
            {
                return Error.Failure("Email.SendFailed", "Failed to send OTP email. Please try again later.");
            }

            var remainingResends = MaxOtpSends - recentOtpCount - 1;

            return new OtpSendResult("New OTP sent to your email.", remainingResends, CooldownSeconds);
        }
    }

    public class ResendOtpCommandValidator : AbstractValidator<ResendOtpCommand>
    {
        public ResendOtpCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.Type).IsInEnum();
        }
    }
}
