using HSTS.Application.Trips.Dtos;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Trips.Commands
{
    // ==================== REMOVE TRIP MEMBER ====================
    public record RemoveTripMemberCommand(int TripId, int UserId) : IRequest<ErrorOr<Success>>;

    public class RemoveTripMemberCommandHandler : IRequestHandler<RemoveTripMemberCommand, ErrorOr<Success>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public RemoveTripMemberCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<Success>> Handle(RemoveTripMemberCommand request, CancellationToken ct)
        {
            var currentUserId = _currentUser.UserId;

            // Verify current user is Leader
            var leaderMember = await _context.TripMembers
                .FirstOrDefaultAsync(tm => tm.TripId == request.TripId && tm.UserId == currentUserId && !tm.IsDeleted, ct);
            if (leaderMember == null || leaderMember.Role != TripRole.Leader)
                return Error.Forbidden("Trip.NotLeader", "Only the trip leader can remove members.");

            // Leader cannot remove themselves
            if (request.UserId == currentUserId)
                return Error.Validation("Trip.CannotRemoveSelf", "Leader cannot remove themselves from the trip.");

            var memberToRemove = await _context.TripMembers
                .FirstOrDefaultAsync(tm => tm.TripId == request.TripId && tm.UserId == request.UserId && !tm.IsDeleted, ct);
            if (memberToRemove == null)
                return Error.NotFound("TripMember.NotFound", "Member not found in this trip.");

            _context.TripMembers.Remove(memberToRemove);
            await _context.SaveChangesAsync(ct);

            return Result.Success;
        }
    }

    // ==================== CHANGE TRIP MEMBER ROLE ====================
    public record ChangeTripMemberRoleCommand(int TripId, int UserId, TripRole NewRole) : IRequest<ErrorOr<Success>>;

    public class ChangeTripMemberRoleCommandValidator : AbstractValidator<ChangeTripMemberRoleCommand>
    {
        public ChangeTripMemberRoleCommandValidator()
        {
            RuleFor(x => x.TripId).GreaterThan(0);
            RuleFor(x => x.UserId).GreaterThan(0);
            RuleFor(x => x.NewRole).IsInEnum();
        }
    }

    /// <summary>
    /// Handles role changes for trip members using a DB transaction.
    /// 
    /// Transaction logic:
    /// - If setting a new Treasurer: ensures only 1 Treasurer exists by downgrading any existing Treasurer to Member.
    /// - If transferring Leader: atomically downgrades the current Leader to Member and upgrades the target to Leader.
    /// - Both operations are wrapped in a single transaction to ensure consistency.
    /// </summary>
    public class ChangeTripMemberRoleCommandHandler : IRequestHandler<ChangeTripMemberRoleCommand, ErrorOr<Success>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public ChangeTripMemberRoleCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<Success>> Handle(ChangeTripMemberRoleCommand request, CancellationToken ct)
        {
            var currentUserId = _currentUser.UserId;

            // Verify current user is Leader
            var currentLeader = await _context.TripMembers
                .FirstOrDefaultAsync(tm => tm.TripId == request.TripId && tm.UserId == currentUserId && !tm.IsDeleted, ct);
            if (currentLeader == null || currentLeader.Role != TripRole.Leader)
                return Error.Forbidden("Trip.NotLeader", "Only the trip leader can change member roles.");

            var targetMember = await _context.TripMembers
                .FirstOrDefaultAsync(tm => tm.TripId == request.TripId && tm.UserId == request.UserId && !tm.IsDeleted, ct);
            if (targetMember == null)
                return Error.NotFound("TripMember.NotFound", "Member not found in this trip.");

            // Use a transaction to ensure atomicity when changing roles
            // This is critical for Leader transfer and Treasurer uniqueness
            using var transaction = await _context.BeginTransactionAsync(ct);
            try
            {
                if (request.NewRole == TripRole.Treasurer)
                {
                    // Ensure only one Treasurer exists: downgrade any existing Treasurer to Member
                    var existingTreasurer = await _context.TripMembers
                        .FirstOrDefaultAsync(tm => tm.TripId == request.TripId
                            && tm.Role == TripRole.Treasurer
                            && !tm.IsDeleted, ct);

                    if (existingTreasurer != null)
                    {
                        existingTreasurer.Role = TripRole.Member;
                    }

                    targetMember.Role = TripRole.Treasurer;
                }
                else if (request.NewRole == TripRole.Leader)
                {
                    // Transfer Leadership: downgrade current Leader to Member, upgrade target to Leader
                    currentLeader.Role = TripRole.Member;
                    targetMember.Role = TripRole.Leader;
                }
                else
                {
                    // Setting to Member role
                    // Cannot demote yourself as leader through this path
                    if (request.UserId == currentUserId)
                        return Error.Validation("Trip.CannotDemoteSelf", "Use the Leader transfer flow instead.");

                    targetMember.Role = request.NewRole;
                }

                await _context.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                return Result.Success;
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        }
    }

    // ==================== GET TRIP MEMBERS ====================
    public record GetTripMembersQuery(int TripId) : IRequest<ErrorOr<List<TripMemberDetailDto>>>;

    public class GetTripMembersQueryHandler : IRequestHandler<GetTripMembersQuery, ErrorOr<List<TripMemberDetailDto>>>
    {
        private readonly IAppDbContext _context;

        public GetTripMembersQueryHandler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<ErrorOr<List<TripMemberDetailDto>>> Handle(GetTripMembersQuery request, CancellationToken ct)
        {
            var members = await _context.TripMembers
                .Include(tm => tm.User)
                .Where(tm => tm.TripId == request.TripId && !tm.IsDeleted)
                .OrderBy(tm => tm.Role)
                .ThenBy(tm => tm.JoinedDate)
                .Select(tm => new TripMemberDetailDto(
                    tm.Id,
                    tm.TripId,
                    tm.UserId,
                    tm.User.FullName,
                    tm.User.AvatarUrl,
                    tm.Role.ToString(),
                    (int)tm.Role,
                    tm.JoinedDate,
                    tm.User.PhoneNumber
                ))
                .ToListAsync(ct);

            return members;
        }
    }
}
