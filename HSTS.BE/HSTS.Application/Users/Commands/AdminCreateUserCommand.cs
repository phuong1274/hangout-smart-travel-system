using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Common.LoggingInterfaces;

namespace HSTS.Application.Users.Commands
{
    public record AdminCreateUserCommand(string Email, string FullName, int RoleId) : IRequest<ErrorOr<string>>;

    public class AdminCreateUserCommandHandler : IRequestHandler<AdminCreateUserCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _ctx;
        private readonly IEmailService _emailService;
        private readonly IEmailDomainPolicy _emailDomainPolicy;
        private readonly ILoggingService _loggingService;

        public AdminCreateUserCommandHandler(IAppDbContext ctx, IEmailService emailService, IEmailDomainPolicy emailDomainPolicy, ILoggingService loggingService)
        {
            _ctx = ctx;
            _emailService = emailService;
            _emailDomainPolicy = emailDomainPolicy;
            _loggingService = loggingService;
        }

        public async Task<ErrorOr<string>> Handle(AdminCreateUserCommand request, CancellationToken cancellationToken)
        {
            if (!_emailDomainPolicy.IsAllowedEmail(request.Email))
                return Error.Validation("Email.DomainNotAllowed", "This email domain is not supported.");

            var emailExists = await _ctx.Accounts
                .AnyAsync(a => a.Email == request.Email && !a.IsDeleted, cancellationToken);

            if (emailExists)
                return Error.Conflict("Account.EmailExists", "An account with this email already exists.");

            var role = await _ctx.Roles
                .FirstOrDefaultAsync(r => r.Id == request.RoleId && !r.IsDeleted, cancellationToken);
            if (role is null)
                return Error.NotFound("Role.NotFound", "Role not found.");

            var account = new Account
            {
                Email = request.Email,
                PasswordHash = null,
                Status = AccountStatus.Active
            };

            var user = new User
            {
                Account = account,
                FullName = request.FullName
            };

            user.Profiles.Add(new Profile { ProfileName = "Default" });
            user.UserRoles.Add(new UserRole { RoleId = role.Id, Role = role, User = user });

            var otpCode = Random.Shared.Next(100000, 999999).ToString();
            var otp = new Otp
            {
                Email = request.Email,
                Code = otpCode,
                Type = OtpType.ForgotPassword,
                ExpiredAt = DateTime.UtcNow.AddMinutes(5)
            };

            try
            {
                await _emailService.SendOtpEmailAsync(request.Email, otpCode, OtpType.ForgotPassword, cancellationToken);
            }
            catch (Exception ex)
            {
                await TryLogErrorAsync($"Failed to send onboarding email for {request.Email}: {ex.Message}");
                return Error.Failure("Email.SendFailed", "Failed to send onboarding email. No user was created. Please try again.");
            }

            _ctx.Users.Add(user);
            _ctx.Otps.Add(otp);
            await _ctx.SaveChangesAsync(cancellationToken);

            await TryLogActivityAsync($"Admin created user {request.Email} with role {role.Name} and sent onboarding email.");

            return "User created and onboarding email sent for password setup.";
        }

        private async Task TryLogActivityAsync(string message)
        {
            try
            {
                await _loggingService.LogActivityAsync(message);
            }
            catch
            {
            }
        }

        private async Task TryLogErrorAsync(string message)
        {
            try
            {
                await _loggingService.LogErrorAsync(message, nameof(AdminCreateUserCommandHandler));
            }
            catch
            {
            }
        }
    }

    public class AdminCreateUserCommandValidator : AbstractValidator<AdminCreateUserCommand>
    {
        public AdminCreateUserCommandValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(150);
            RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
            RuleFor(x => x.RoleId).GreaterThan(0);
        }
    }
}
