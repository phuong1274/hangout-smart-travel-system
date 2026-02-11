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

        public RegisterCommandHandler(IAppDbContext context, IEmailService emailService, IPasswordHasher passwordHasher)
        {
            _context = context;
            _emailService = emailService;
            _passwordHasher = passwordHasher;
        }

        public async Task<ErrorOr<string>> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            var emailExists = await _context.Accounts
                .AnyAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (emailExists)
                return Error.Conflict("Account.EmailExists", "An account with this email already exists.");

            var passwordHash = _passwordHasher.Hash(request.Password);

            var account = new Account
            {
                Email = request.Email,
                PasswordHash = passwordHash,
                Status = AccountStatus.PendingVerification
            };

            _context.Accounts.Add(account);
            await _context.SaveChangesAsync(cancellationToken);

            var user = new User
            {
                AccountId = account.Id,
                FullName = request.FullName
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            var defaultProfile = new Profile
            {
                UserId = user.Id,
                ProfileName = "Default"
            };

            _context.Profiles.Add(defaultProfile);

            var travelerRole = await _context.Roles
                .FirstAsync(r => r.Name == "TRAVELER", cancellationToken);

            _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = travelerRole.Id });

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

            await _emailService.SendOtpEmailAsync(request.Email, otpCode, OtpType.EmailVerification, cancellationToken);

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
