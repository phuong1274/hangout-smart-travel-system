using HSTS.Application.Invitations.Dtos;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Invitations.Queries
{
    // ==================== VERIFY INVITATION TOKEN ====================
    public record VerifyInvitationQuery(string Token) : IRequest<ErrorOr<InvitationVerifyDto>>;

    public class VerifyInvitationQueryHandler : IRequestHandler<VerifyInvitationQuery, ErrorOr<InvitationVerifyDto>>
    {
        private readonly IAppDbContext _context;

        public VerifyInvitationQueryHandler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<ErrorOr<InvitationVerifyDto>> Handle(VerifyInvitationQuery request, CancellationToken ct)
        {
            var invitation = await _context.TripInvitations
                .Include(ti => ti.Trip)
                .Include(ti => ti.Inviter)
                .FirstOrDefaultAsync(ti => ti.Token == request.Token && !ti.IsDeleted, ct);

            if (invitation == null)
                return Error.NotFound("Invitation.NotFound", "Invalid invitation token.");

            if (invitation.Status != InvitationStatus.Pending)
                return Error.Validation("Invitation.NotPending", "This invitation is no longer pending.");

            if (invitation.ExpirationDate < DateTime.UtcNow)
            {
                invitation.Status = InvitationStatus.Expired;
                await _context.SaveChangesAsync(ct);
                return Error.Validation("Invitation.Expired", "This invitation has expired.");
            }

            return new InvitationVerifyDto(
                invitation.Id,
                invitation.TripId,
                invitation.Trip.TripName,
                invitation.Inviter.FullName
            );
        }
    }

    // ==================== GET MY PENDING INVITATIONS ====================
    public record GetMyInvitationsQuery() : IRequest<ErrorOr<List<TripInvitationDto>>>;

    public class GetMyInvitationsQueryHandler : IRequestHandler<GetMyInvitationsQuery, ErrorOr<List<TripInvitationDto>>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public GetMyInvitationsQueryHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<List<TripInvitationDto>>> Handle(GetMyInvitationsQuery request, CancellationToken ct)
        {
            var currentUserId = _currentUser.UserId;

            var invitations = await _context.TripInvitations
                .Include(ti => ti.Trip)
                .Include(ti => ti.Inviter)
                .Include(ti => ti.Invitee)
                .Where(ti => ti.InviteeId == currentUserId
                    && ti.Status == InvitationStatus.Pending
                    && ti.ExpirationDate > DateTime.UtcNow
                    && !ti.IsDeleted)
                .OrderByDescending(ti => ti.CreatedAt)
                .Select(ti => new TripInvitationDto(
                    ti.Id,
                    ti.TripId,
                    ti.Trip.TripName,
                    ti.Inviter.FullName,
                    ti.Invitee.FullName,
                    ti.Token,
                    ti.ExpirationDate,
                    ti.Status.ToString(),
                    ti.CreatedAt
                ))
                .ToListAsync(ct);

            return invitations;
        }
    }
}
