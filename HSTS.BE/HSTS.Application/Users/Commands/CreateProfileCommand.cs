using HSTS.Application.Interfaces;

namespace HSTS.Application.Users.Commands
{
    public record CreateProfileCommand(
        string ProfileName,
        string? Address,
        string? AvatarUrl) : IRequest<ErrorOr<ProfileDto>>;

    public class CreateProfileCommandHandler : IRequestHandler<CreateProfileCommand, ErrorOr<ProfileDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public CreateProfileCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<ProfileDto>> Handle(CreateProfileCommand request, CancellationToken cancellationToken)
        {
            var profile = new Profile
            {
                UserId = _currentUser.UserId,
                ProfileName = request.ProfileName,
                Address = request.Address,
                AvatarUrl = request.AvatarUrl
            };

            _context.Profiles.Add(profile);
            await _context.SaveChangesAsync(cancellationToken);

            return profile.ToDto();
        }
    }

    public class CreateProfileCommandValidator : AbstractValidator<CreateProfileCommand>
    {
        public CreateProfileCommandValidator()
        {
            RuleFor(x => x.ProfileName).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Address).MaximumLength(500).When(x => x.Address != null);
            RuleFor(x => x.AvatarUrl).MaximumLength(500).When(x => x.AvatarUrl != null);
        }
    }
}
