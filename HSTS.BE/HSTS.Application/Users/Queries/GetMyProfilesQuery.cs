using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Queries
{
    public record GetMyProfilesQuery() : IRequest<ErrorOr<IList<ProfileDto>>>;

    public class GetMyProfilesQueryHandler : IRequestHandler<GetMyProfilesQuery, ErrorOr<IList<ProfileDto>>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public GetMyProfilesQueryHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<IList<ProfileDto>>> Handle(GetMyProfilesQuery request, CancellationToken cancellationToken)
        {
            var profiles = await _context.Profiles
                .Where(p => p.UserId == _currentUser.UserId && !p.IsDeleted)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => p.ToDto())
                .ToListAsync(cancellationToken);

            return profiles;
        }
    }
}
