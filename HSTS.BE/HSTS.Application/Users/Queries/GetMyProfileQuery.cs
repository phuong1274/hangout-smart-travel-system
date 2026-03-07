using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Queries
{
    public record GetMyProfileQuery(int ProfileId) : IRequest<ErrorOr<ProfileDto>>;

    public class GetMyProfileQueryHandler : IRequestHandler<GetMyProfileQuery, ErrorOr<ProfileDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public GetMyProfileQueryHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<ProfileDto>> Handle(GetMyProfileQuery request, CancellationToken cancellationToken)
        {
            var profile = await _context.Profiles
                .FirstOrDefaultAsync(p => p.Id == request.ProfileId
                    && p.UserId == _currentUser.UserId
                    && !p.IsDeleted, cancellationToken);

            if (profile is null)
                return Error.NotFound("Profile.NotFound", "Profile not found.");

            return profile.ToDto();
        }
    }
}
