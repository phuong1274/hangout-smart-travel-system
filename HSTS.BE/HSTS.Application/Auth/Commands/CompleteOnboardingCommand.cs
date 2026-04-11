using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Auth.Commands
{
    public record CompleteOnboardingCommand(string Token, string NewPassword) : IRequest<ErrorOr<string>>;

    public class CompleteOnboardingCommandHandler : IRequestHandler<CompleteOnboardingCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public CompleteOnboardingCommandHandler(IAppDbContext context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task<ErrorOr<string>> Handle(CompleteOnboardingCommand request, CancellationToken cancellationToken)
        {
            var setupToken = await _context.PasswordSetupTokens
                .Include(t => t.Account)
                .Where(t => t.Token == request.Token && !t.IsUsed && t.ExpiredAt > DateTime.UtcNow)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (setupToken is null)
                return Error.Validation("Onboarding.InvalidToken", "Invalid or expired onboarding link.");

            setupToken.IsUsed = true;
            setupToken.Account.PasswordHash = _passwordHasher.Hash(request.NewPassword);

            var refreshTokens = await _context.AccountRefreshTokens
                .Where(t => t.AccountId == setupToken.AccountId && t.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var refreshToken in refreshTokens)
                refreshToken.RevokedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return "Password set successfully. Please sign in with your new password.";
        }
    }

    public class CompleteOnboardingCommandValidator : AbstractValidator<CompleteOnboardingCommand>
    {
        public CompleteOnboardingCommandValidator()
        {
            RuleFor(x => x.Token).NotEmpty();
            RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(128);
        }
    }
}
