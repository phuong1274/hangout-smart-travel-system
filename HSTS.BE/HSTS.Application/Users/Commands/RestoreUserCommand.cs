using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using HSTS.Application.Common.LoggingInterfaces;

namespace HSTS.Application.Users.Commands
{
    public record RestoreUserCommand(int UserId) : IRequest<ErrorOr<Unit>>;

    public class RestoreUserCommandHandler : IRequestHandler<RestoreUserCommand, ErrorOr<Unit>>
    {
        private readonly IAppDbContext _ctx;
        private readonly ILoggingService _loggingService;

        public RestoreUserCommandHandler(IAppDbContext ctx, ILoggingService loggingService)
        {
            _ctx = ctx;
            _loggingService = loggingService;
        }

        public async Task<ErrorOr<Unit>> Handle(RestoreUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _ctx.Users
                .Include(u => u.Account)
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

            if (user is null)
                return Error.NotFound("User.NotFound", "User not found.");

            user.IsDeleted = false;
            user.Account.IsDeleted = false;
            await _ctx.SaveChangesAsync(cancellationToken);
            await TryLogActivityAsync($"Admin restored user {user.Account.Email}.");

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

    public class RestoreUserCommandValidator : AbstractValidator<RestoreUserCommand>
    {
        public RestoreUserCommandValidator()
        {
            RuleFor(x => x.UserId).GreaterThan(0);
        }
    }
}
