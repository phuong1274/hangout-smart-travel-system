using HSTS.Application.Trips.Dtos;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Trips.Commands
{
    // ==================== JOIN TRIP BY CODE ====================
    public record JoinTripByCodeCommand(string JoinCode) : IRequest<ErrorOr<TripMemberDetailDto>>;

    public class JoinTripByCodeCommandValidator : AbstractValidator<JoinTripByCodeCommand>
    {
        public JoinTripByCodeCommandValidator()
        {
            RuleFor(x => x.JoinCode).NotEmpty().MaximumLength(10);
        }
    }

    public class JoinTripByCodeCommandHandler : IRequestHandler<JoinTripByCodeCommand, ErrorOr<TripMemberDetailDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public JoinTripByCodeCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<TripMemberDetailDto>> Handle(JoinTripByCodeCommand request, CancellationToken ct)
        {
            var currentUserId = _currentUser.UserId;

            // Find trip by active join code
            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.JoinCode == request.JoinCode
                    && t.IsJoinCodeActive
                    && !t.IsDeleted, ct);

            if (trip == null)
                return Error.NotFound("Trip.InvalidJoinCode", "Invalid or inactive join code.");

            // Check if already a member
            var isMember = await _context.TripMembers
                .AnyAsync(tm => tm.TripId == trip.Id && tm.UserId == currentUserId && !tm.IsDeleted, ct);
            if (isMember)
                return Error.Validation("Trip.AlreadyMember", "You are already a member of this trip.");

            // Check phone number requirement
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId, ct);
            if (user == null)
                return Error.NotFound("User.NotFound", "User not found.");

            if (string.IsNullOrWhiteSpace(user.PhoneNumber))
                return Error.Validation("Phone_Number_Required", "Phone_Number_Required");

            var tripMember = new TripMember
            {
                TripId = trip.Id,
                UserId = currentUserId,
                Role = TripRole.Member,
                JoinedDate = DateTime.UtcNow
            };

            _context.TripMembers.Add(tripMember);
            await _context.SaveChangesAsync(ct);

            return new TripMemberDetailDto(
                tripMember.Id,
                tripMember.TripId,
                tripMember.UserId.Value,
                user.FullName,
                user.AvatarUrl,
                TripRole.Member.ToString(),
                (int)TripRole.Member,
                tripMember.JoinedDate,
                user.PhoneNumber
            );
        }
    }

    // ==================== UPDATE JOIN CODE SETTINGS ====================
    public record UpdateJoinCodeCommand(int TripId, bool IsActive, bool Regenerate) : IRequest<ErrorOr<TripJoinCodeDto>>;

    public class UpdateJoinCodeCommandHandler : IRequestHandler<UpdateJoinCodeCommand, ErrorOr<TripJoinCodeDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public UpdateJoinCodeCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<TripJoinCodeDto>> Handle(UpdateJoinCodeCommand request, CancellationToken ct)
        {
            var currentUserId = _currentUser.UserId;

            // Verify current user is Leader
            var leaderMember = await _context.TripMembers
                .FirstOrDefaultAsync(tm => tm.TripId == request.TripId && tm.UserId == currentUserId && !tm.IsDeleted, ct);
            if (leaderMember == null || leaderMember.Role != TripRole.Leader)
                return Error.Forbidden("Trip.NotLeader", "Only the trip leader can manage join codes.");

            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == request.TripId && !t.IsDeleted, ct);
            if (trip == null)
                return Error.NotFound("Trip.NotFound", "Trip not found.");

            if (request.Regenerate)
            {
                // Generate a unique 8-character alphanumeric code
                string newCode;
                do
                {
                    newCode = GenerateJoinCode(8);
                }
                while (await _context.Trips.AnyAsync(t => t.JoinCode == newCode, ct));

                trip.JoinCode = newCode;
                // Auto-activate when regenerating — a new code should be usable
                trip.IsJoinCodeActive = true;
            }
            else
            {
                trip.IsJoinCodeActive = request.IsActive;
            }
            await _context.SaveChangesAsync(ct);

            return new TripJoinCodeDto(trip.JoinCode, trip.IsJoinCodeActive);
        }

        private static string GenerateJoinCode(int length)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var random = new Random();
            return new string(Enumerable.Range(0, length).Select(_ => chars[random.Next(chars.Length)]).ToArray());
        }
    }
}
