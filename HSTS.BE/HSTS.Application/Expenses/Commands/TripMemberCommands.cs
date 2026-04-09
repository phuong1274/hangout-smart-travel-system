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
        string Name,
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

        public CreateTripMemberCommandHandler(
            IRepository<TripMember> memberRepository,
            IRepository<Trip> tripRepository)
        {
            _memberRepository = memberRepository;
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<TripMemberDto>> Handle(CreateTripMemberCommand request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetAsync(request.TripId, cancellationToken);
            if (trip == null)
            {
                return Error.NotFound("TripMember.TripNotFound", "Trip not found.");
            }

            if (!Enum.TryParse<Domain.Enums.TripMemberRole>(request.Role, out var role))
            {
                return Error.Validation("TripMember.InvalidRole", "Invalid trip member role.");
            }

            var member = new TripMember
            {
                TripId = request.TripId,
                UserId = request.UserId,
                Name = request.Name,
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

            if (!Enum.TryParse<Domain.Enums.TripMemberRole>(request.Role, out var role))
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
