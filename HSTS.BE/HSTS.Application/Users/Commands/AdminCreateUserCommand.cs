using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Common.LoggingInterfaces;
using System.Security.Cryptography;

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
                .AnyAsync(a => a.Email == request.Email, cancellationToken);

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

            var setupToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            var passwordSetupToken = new PasswordSetupToken
            {
                Account = account,
                Token = setupToken,
                ExpiredAt = DateTime.UtcNow.AddMinutes(30),
                IsUsed = false
            };

            var setupLink = $"http://localhost:5173/auth/reset-password?mode=onboarding&token={Uri.EscapeDataString(setupToken)}&email={Uri.EscapeDataString(request.Email)}";

            _ctx.Users.Add(user);
            _ctx.PasswordSetupTokens.Add(passwordSetupToken);
            await _ctx.SaveChangesAsync(cancellationToken);

            try
            {
                await _emailService.SendOnboardingLinkEmailAsync(request.Email, setupLink, cancellationToken);
            }
            catch (Exception ex)
            {
                user.IsDeleted = true;
                account.IsDeleted = true;
                passwordSetupToken.IsUsed = true;
                await _ctx.SaveChangesAsync(cancellationToken);
                await TryLogErrorAsync($"Failed to send onboarding email for {request.Email}: {ex.Message}");
                return Error.Failure("Email.SendFailed", "Failed to send onboarding email. No user was created. Please try again.");
            }

            await TryLogActivityAsync($"Admin created user {request.Email} with role {role.Name} and sent onboarding link.");

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
