using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Auth.Interfaces;

namespace HSTS.Application.Auth.Commands
{
    public record RegisterCommand(string Email, string Password, string FullName) : IRequest<ErrorOr<string>>;

    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IEmailDomainPolicy _emailDomainPolicy;

        public RegisterCommandHandler(
            IAppDbContext context,
            IEmailService emailService,
            IPasswordHasher passwordHasher,
            IEmailDomainPolicy emailDomainPolicy)
        {
            _context = context;
            _emailService = emailService;
            _passwordHasher = passwordHasher;
            _emailDomainPolicy = emailDomainPolicy;
        }

        public async Task<ErrorOr<string>> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            if (!_emailDomainPolicy.IsAllowedEmail(request.Email))
                return Error.Validation("Email.DomainNotAllowed", "This email domain is not supported.");

            var emailExists = await _context.Accounts
                .AnyAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (emailExists)
                return Error.Conflict("Account.EmailExists", "An account with this email already exists.");

            var passwordHash = _passwordHasher.Hash(request.Password);

            var travelerRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == "TRAVELER", cancellationToken);
            if (travelerRole is null)
                return Error.Failure("Role.NotFound", "Default role not found. Please contact support.");

            var account = new Account
            {
                Email = request.Email,
                PasswordHash = passwordHash,
                Status = AccountStatus.PendingVerification
            };

            var user = new User
            {
                Account = account,
                FullName = request.FullName
            };

            user.Profiles.Add(new Profile { ProfileName = "Default" });
            user.UserRoles.Add(new UserRole { RoleId = travelerRole.Id });

            _context.Users.Add(user);

            await _context.SaveChangesAsync(cancellationToken);

            // Generate and save OTP
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

            try
            {
                await _emailService.SendOtpEmailAsync(request.Email, otpCode, OtpType.EmailVerification, cancellationToken);
            }
            catch
            {
                return Error.Failure("Email.SendFailed", "Account created but failed to send OTP email. Please use resend OTP.");
            }

            return "OTP sent to your email. Please verify to activate your account.";
        }
    }

    public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
    {
        public RegisterCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(150);
            RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
            RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        }
    }
}
