using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Invitations.Dtos;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Invitations.Commands
{
    // ==================== CREATE INVITATION ====================
    public record CreateInvitationCommand(int TripId, string Email) : IRequest<ErrorOr<TripInvitationDto>>;

    public class CreateInvitationCommandValidator : AbstractValidator<CreateInvitationCommand>
    {
        public CreateInvitationCommandValidator()
        {
            RuleFor(x => x.TripId).GreaterThan(0);
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
        }
    }

    public class CreateInvitationCommandHandler : IRequestHandler<CreateInvitationCommand, ErrorOr<TripInvitationDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IEmailService _emailService;

        public CreateInvitationCommandHandler(IAppDbContext context, ICurrentUserService currentUser, IEmailService emailService)
        {
            _context = context;
            _currentUser = currentUser;
            _emailService = emailService;
        }

        public async Task<ErrorOr<TripInvitationDto>> Handle(CreateInvitationCommand request, CancellationToken ct)
        {
            var currentUserId = _currentUser.UserId;

            // Verify the trip exists
            var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == request.TripId && !t.IsDeleted, ct);
            if (trip == null)
                return Error.NotFound("Trip.NotFound", "Trip not found.");

            // Verify current user is the Leader
            var leaderMember = await _context.TripMembers
                .FirstOrDefaultAsync(tm => tm.TripId == request.TripId && tm.UserId == currentUserId && !tm.IsDeleted, ct);
            if (leaderMember == null || leaderMember.Role != TripRole.Leader)
                return Error.Forbidden("Trip.NotLeader", "Only the trip leader can send invitations.");

            // Find the invitee by email (through Account -> User)
            var inviteeAccount = await _context.Accounts
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Email == request.Email && !a.IsDeleted, ct);
            if (inviteeAccount?.User == null)
                return Error.NotFound("User.NotFound", "No user found with this email address.");

            var inviteeId = inviteeAccount.User.Id;

            // Cannot invite yourself
            if (inviteeId == currentUserId)
                return Error.Validation("Invitation.SelfInvite", "You cannot invite yourself.");

            // Check if already a member
            var isMember = await _context.TripMembers
                .AnyAsync(tm => tm.TripId == request.TripId && tm.UserId == inviteeId && !tm.IsDeleted, ct);
            if (isMember)
                return Error.Validation("Invitation.AlreadyMember", "User is already a member of this trip.");

            // Check for existing pending invitation
            var hasPending = await _context.TripInvitations
                .AnyAsync(ti => ti.TripId == request.TripId
                    && ti.InviteeId == inviteeId
                    && ti.Status == InvitationStatus.Pending
                    && !ti.IsDeleted, ct);
            if (hasPending)
                return Error.Validation("Invitation.AlreadyPending", "A pending invitation already exists for this user.");

            var invitation = new TripInvitation
            {
                TripId = request.TripId,
                InviterId = currentUserId,
                InviteeId = inviteeId,
                Token = Guid.NewGuid().ToString("N"),
                ExpirationDate = DateTime.UtcNow.AddDays(3),
                Status = InvitationStatus.Pending
            };

            _context.TripInvitations.Add(invitation);
            await _context.SaveChangesAsync(ct);

            var inviterName = (await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId, ct))?.FullName ?? "Unknown";

            // Log invitation link to console for testing
            Console.WriteLine($"[INVITATION] {inviterName} invited {inviteeAccount.Email} to '{trip.TripName}'");
            Console.WriteLine($"[INVITATION] Accept link: http://localhost:5173/invitations/accept?token={invitation.Token}");

            // Send invitation notification email (best-effort, don't fail if email fails)
            try
            {
                await _emailService.SendTripInvitationEmailAsync(
                    inviteeAccount.Email,
                    inviterName,
                    trip.TripName,
                    invitation.Token,
                    ct);
            }
            catch (Exception ex)
            {
                // Email is best-effort — log but don't fail the invitation
                System.Diagnostics.Debug.WriteLine($"Failed to send invitation email: {ex.Message}");
            }

            return new TripInvitationDto(
                invitation.Id,
                trip.Id,
                trip.TripName,
                inviterName,
                inviteeAccount.User.FullName,
                invitation.Token,
                invitation.ExpirationDate,
                invitation.Status.ToString(),
                invitation.CreatedAt
            );
        }
    }

    // ==================== RESPOND TO INVITATION ====================
    public record RespondInvitationCommand(int Id, bool IsAccepted) : IRequest<ErrorOr<Success>>;

    public class RespondInvitationCommandValidator : AbstractValidator<RespondInvitationCommand>
    {
        public RespondInvitationCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0);
        }
    }

    public class RespondInvitationCommandHandler : IRequestHandler<RespondInvitationCommand, ErrorOr<Success>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public RespondInvitationCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<Success>> Handle(RespondInvitationCommand request, CancellationToken ct)
        {
            var currentUserId = _currentUser.UserId;

            var invitation = await _context.TripInvitations
                .Include(ti => ti.Trip)
                .FirstOrDefaultAsync(ti => ti.Id == request.Id && !ti.IsDeleted, ct);

            if (invitation == null)
                return Error.NotFound("Invitation.NotFound", "Invitation not found.");

            if (invitation.InviteeId != currentUserId)
                return Error.Forbidden("Invitation.NotInvitee", "You are not the invitee for this invitation.");

            if (invitation.Status != InvitationStatus.Pending)
                return Error.Validation("Invitation.NotPending", "This invitation is no longer pending.");

            if (invitation.ExpirationDate < DateTime.UtcNow)
            {
                invitation.Status = InvitationStatus.Expired;
                await _context.SaveChangesAsync(ct);
                return Error.Validation("Invitation.Expired", "This invitation has expired.");
            }

            if (!request.IsAccepted)
            {
                invitation.Status = InvitationStatus.Rejected;
                await _context.SaveChangesAsync(ct);
                return Result.Success;
            }

            // Accepted flow: check phone number requirement
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId, ct);
            if (user == null)
                return Error.NotFound("User.NotFound", "User not found.");

            if (string.IsNullOrWhiteSpace(user.PhoneNumber))
                return Error.Validation("Phone_Number_Required", "Phone_Number_Required");

            // Check if somehow already a member (race condition guard)
            var isMember = await _context.TripMembers
                .AnyAsync(tm => tm.TripId == invitation.TripId && tm.UserId == currentUserId && !tm.IsDeleted, ct);
            if (isMember)
            {
                invitation.Status = InvitationStatus.Accepted;
                await _context.SaveChangesAsync(ct);
                return Result.Success;
            }

            // Add as member
            var tripMember = new TripMember
            {
                TripId = invitation.TripId,
                UserId = currentUserId,
                Role = TripRole.Member,
                JoinedDate = DateTime.UtcNow
            };
            _context.TripMembers.Add(tripMember);

            invitation.Status = InvitationStatus.Accepted;
            await _context.SaveChangesAsync(ct);

            return Result.Success;
        }
    }
}
