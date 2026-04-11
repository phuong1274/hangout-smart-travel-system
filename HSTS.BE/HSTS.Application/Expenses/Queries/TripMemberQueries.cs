using ErrorOr;
using HSTS.Application.Expenses;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Expenses.Queries
{
    public record GetTripMemberByIdQuery(int MemberId) : IRequest<ErrorOr<TripMemberDto>>;
    public record GetTripMembersByTripQuery(int TripId) : IRequest<ErrorOr<List<TripMemberDto>>>;

    public class GetTripMemberByIdQueryHandler : IRequestHandler<GetTripMemberByIdQuery, ErrorOr<TripMemberDto>>
    {
        private readonly IRepository<TripMember> _memberRepository;

        public GetTripMemberByIdQueryHandler(IRepository<TripMember> memberRepository)
        {
            _memberRepository = memberRepository;
        }

        public async Task<ErrorOr<TripMemberDto>> Handle(GetTripMemberByIdQuery request, CancellationToken cancellationToken)
        {
            var member = await _memberRepository.GetAsync(request.MemberId, cancellationToken);
            if (member == null)
            {
                return Error.NotFound("TripMember.NotFound", "Trip member not found.");
            }

            return member.ToDto();
        }
    }

    public class GetTripMembersByTripQueryHandler : IRequestHandler<GetTripMembersByTripQuery, ErrorOr<List<TripMemberDto>>>
    {
        private readonly IRepository<TripMember> _memberRepository;

        public GetTripMembersByTripQueryHandler(IRepository<TripMember> memberRepository)
        {
            _memberRepository = memberRepository;
        }

        public async Task<ErrorOr<List<TripMemberDto>>> Handle(GetTripMembersByTripQuery request, CancellationToken cancellationToken)
        {
            var members = await _memberRepository.Query()
                .Where(m => m.TripId == request.TripId)
                .OrderBy(m => m.Name)
                .ToListAsync(cancellationToken);

            return members.Select(m => m.ToDto()).ToList();
        }
    }
}
