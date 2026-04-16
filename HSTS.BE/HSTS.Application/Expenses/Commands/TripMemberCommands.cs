using ErrorOr;
using HSTS.Application.Expenses;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Expenses.Commands
{
    public record CreateTripMemberCommand(
        int TripId,
        int? UserId,
        string? Name,
        string Role
    ) : IRequest<ErrorOr<TripMemberDto>>;

    public record UpdateTripMemberCommand(
        int MemberId,
        string Role
    ) : IRequest<ErrorOr<TripMemberDto>>;

    public record DeleteTripMemberCommand(int MemberId) : IRequest<ErrorOr<Success>>;

    public class CreateTripMemberCommandHandler : IRequestHandler<CreateTripMemberCommand, ErrorOr<TripMemberDto>>
    {
        private readonly IRepository<TripMember> _memberRepository;
        private readonly IRepository<Trip> _tripRepository;
        private readonly IRepository<User> _userRepository;

        public CreateTripMemberCommandHandler(
            IRepository<TripMember> memberRepository,
            IRepository<Trip> tripRepository,
            IRepository<User> userRepository)
        {
            _memberRepository = memberRepository;
            _tripRepository = tripRepository;
            _userRepository = userRepository;
        }

        public async Task<ErrorOr<TripMemberDto>> Handle(CreateTripMemberCommand request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetAsync(request.TripId, cancellationToken);
            if (trip == null)
            {
                return Error.NotFound("TripMember.TripNotFound", "Trip not found.");
            }

            if (!Enum.TryParse<Domain.Enums.TripRole>(request.Role, out var role))
            {
                return Error.Validation("TripMember.InvalidRole", "Invalid trip member role.");
            }

            string resolvedName = request.Name ?? string.Empty;
            if (request.UserId.HasValue)
            {
                var user = await _userRepository.GetAsync(request.UserId.Value, cancellationToken);
                if (user == null)
                {
                    return Error.NotFound("TripMember.UserNotFound", "User not found.");
                }
                resolvedName = user.FullName;
            }
            else if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Error.Validation("TripMember.NameRequired", "Name is required when adding a member without a user account.");
            }

            var member = new TripMember
            {
                TripId = request.TripId,
                UserId = request.UserId,
                Role = role
            };

            await _memberRepository.AddAsync(member, cancellationToken);

            return member.ToDto();
        }
    }

    public class UpdateTripMemberCommandHandler : IRequestHandler<UpdateTripMemberCommand, ErrorOr<TripMemberDto>>
    {
        private readonly IRepository<TripMember> _memberRepository;

        public UpdateTripMemberCommandHandler(IRepository<TripMember> memberRepository)
        {
            _memberRepository = memberRepository;
        }

        public async Task<ErrorOr<TripMemberDto>> Handle(UpdateTripMemberCommand request, CancellationToken cancellationToken)
        {
            var member = await _memberRepository.GetAsync(request.MemberId, cancellationToken);
            if (member == null)
            {
                return Error.NotFound("TripMember.NotFound", "Trip member not found.");
            }

            if (!Enum.TryParse<Domain.Enums.TripRole>(request.Role, out var role))
            {
                return Error.Validation("TripMember.InvalidRole", "Invalid trip member role.");
            }

            member.Role = role;
            await _memberRepository.UpdateAsync(member, cancellationToken);

            return member.ToDto();
        }
    }

    public class DeleteTripMemberCommandHandler : IRequestHandler<DeleteTripMemberCommand, ErrorOr<Success>>
    {
        private readonly IRepository<TripMember> _memberRepository;

        public DeleteTripMemberCommandHandler(IRepository<TripMember> memberRepository)
        {
            _memberRepository = memberRepository;
        }

        public async Task<ErrorOr<Success>> Handle(DeleteTripMemberCommand request, CancellationToken cancellationToken)
        {
            var member = await _memberRepository.GetAsync(request.MemberId, cancellationToken);
            if (member == null)
            {
                return Error.NotFound("TripMember.NotFound", "Trip member not found.");
            }

            await _memberRepository.DeleteAsync(member, cancellationToken);

            return Result.Success;
        }
    }
}
