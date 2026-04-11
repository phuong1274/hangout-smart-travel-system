using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Common.LoggingInterfaces;

namespace HSTS.Application.Users.Commands
{
    public record UnbanUserCommand(int UserId) : IRequest<ErrorOr<Unit>>;

    public class UnbanUserCommandHandler : IRequestHandler<UnbanUserCommand, ErrorOr<Unit>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ILoggingService _loggingService;

        public UnbanUserCommandHandler(IAppDbContext ctx, ILoggingService loggingService)
        {
            _ctx = ctx;
            _loggingService = loggingService;
        }

        public async Task<ErrorOr<Unit>> Handle(UnbanUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _ctx.Users
                .Include(u => u.Account)
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

            if (user is null)
                return Error.NotFound("User.NotFound", "User not found.");

            user.Account.Status = HSTS.Domain.Enums.AccountStatus.Active;
            await _ctx.SaveChangesAsync(cancellationToken);
            await TryLogActivityAsync($"Admin unbanned user {user.Account.Email}.");

            return Unit.Value;
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
    }

    public class UnbanUserCommandValidator : AbstractValidator<UnbanUserCommand>
    {
        public UnbanUserCommandValidator()
        {
            RuleFor(x => x.UserId).GreaterThan(0);
        }
    }
}
