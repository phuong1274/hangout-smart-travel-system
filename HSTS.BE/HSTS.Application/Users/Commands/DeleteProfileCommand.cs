using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Commands
{
    public record DeleteProfileCommand(int ProfileId) : IRequest<ErrorOr<Deleted>>;

    public class DeleteProfileCommandHandler : IRequestHandler<DeleteProfileCommand, ErrorOr<Deleted>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public DeleteProfileCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteProfileCommand request, CancellationToken cancellationToken)
        {
            var profile = await _context.Profiles
                .FirstOrDefaultAsync(p => p.Id == request.ProfileId
                    && p.UserId == _currentUser.UserId
                    && !p.IsDeleted, cancellationToken);

            if (profile is null)
                return Error.NotFound("Profile.NotFound", "Profile not found.");

            profile.IsDeleted = true;
            await _context.SaveChangesAsync(cancellationToken);

            return Result.Deleted;
        }
    }
}
