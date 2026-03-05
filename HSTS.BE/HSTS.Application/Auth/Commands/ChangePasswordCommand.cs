using HSTS.Application.Interfaces;
using HSTS.Application.Auth.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Auth.Commands
{
    public record ChangePasswordCommand(string CurrentPassword, string NewPassword) : IRequest<ErrorOr<string>>;

    public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IPasswordHasher _passwordHasher;

        public ChangePasswordCommandHandler(IAppDbContext context, ICurrentUserService currentUser, IPasswordHasher passwordHasher)
        {
            _context = context;
            _currentUser = currentUser;
            _passwordHasher = passwordHasher;
        }

        public async Task<ErrorOr<string>> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == _currentUser.AccountId && !a.IsDeleted, cancellationToken);

            if (account is null)
                return Error.NotFound("Account.NotFound", "Account not found.");

            if (account.PasswordHash is null)
                return Error.Validation("Auth.NoPassword", "This account uses Google sign-in and has no password to change.");

            if (!_passwordHasher.Verify(request.CurrentPassword, account.PasswordHash))
                return Error.Validation("Auth.WrongPassword", "Current password is incorrect.");

            if (request.CurrentPassword == request.NewPassword)
                return Error.Validation("Auth.SamePassword", "New password must be different from current password.");

            account.PasswordHash = _passwordHasher.Hash(request.NewPassword);

            // Revoke all refresh tokens to force re-login on other devices
            var tokens = await _context.AccountRefreshTokens
                .Where(t => t.AccountId == account.Id && t.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var token in tokens)
                token.RevokedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return "Password changed successfully. Please sign in again.";
        }
    }

    public class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
    {
        public ChangePasswordCommandValidator()
        {
            RuleFor(x => x.CurrentPassword).NotEmpty();
            RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(128);
        }
    }
}
