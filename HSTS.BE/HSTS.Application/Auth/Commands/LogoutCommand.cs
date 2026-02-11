using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Auth.Commands
{
    public record LogoutCommand(string RefreshToken) : IRequest<ErrorOr<string>>;

    public class LogoutCommandHandler : IRequestHandler<LogoutCommand, ErrorOr<string>>
    {
        private readonly IAppDbContext _context;

        public LogoutCommandHandler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<ErrorOr<string>> Handle(LogoutCommand request, CancellationToken cancellationToken)
        {
            var storedToken = await _context.AccountRefreshTokens
                .FirstOrDefaultAsync(t => t.Token == request.RefreshToken && t.RevokedAt == null, cancellationToken);

            if (storedToken is not null)
            {
                storedToken.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }

            return "Logged out successfully.";
        }
    }

    public class LogoutCommandValidator : AbstractValidator<LogoutCommand>
    {
        public LogoutCommandValidator()
        {
            RuleFor(x => x.RefreshToken).NotEmpty();
        }
    }
}
