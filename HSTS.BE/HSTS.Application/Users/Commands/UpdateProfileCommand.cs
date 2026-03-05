using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Commands
{
    public record UpdateProfileCommand(
        int ProfileId,
        string ProfileName,
        string? Address,
        string? AvatarUrl) : IRequest<ErrorOr<ProfileDto>>;

    public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, ErrorOr<ProfileDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public UpdateProfileCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<ProfileDto>> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
        {
            var profile = await _context.Profiles
                .FirstOrDefaultAsync(p => p.Id == request.ProfileId
                    && p.UserId == _currentUser.UserId
                    && !p.IsDeleted, cancellationToken);

            if (profile is null)
                return Error.NotFound("Profile.NotFound", "Profile not found.");

            profile.ProfileName = request.ProfileName;
            profile.Address = request.Address;
            profile.AvatarUrl = request.AvatarUrl;

            await _context.SaveChangesAsync(cancellationToken);

            return profile.ToDto();
        }
    }

    public class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
    {
        public UpdateProfileCommandValidator()
        {
            RuleFor(x => x.ProfileName).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Address).MaximumLength(500).When(x => x.Address != null);
            RuleFor(x => x.AvatarUrl).MaximumLength(500).When(x => x.AvatarUrl != null);
        }
    }
}
