using ErrorOr;
using HSTS.Application.Trips;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Trips.Queries
{
    public record GetTripByIdQuery(int TripId) : IRequest<ErrorOr<TripDto>>;
    public record GetTripsByProfileQuery(int ProfileId) : IRequest<ErrorOr<List<TripDto>>>;

    public class GetTripByIdQueryHandler : IRequestHandler<GetTripByIdQuery, ErrorOr<TripDto>>
    {
        private readonly IRepository<Trip> _tripRepository;

        public GetTripByIdQueryHandler(IRepository<Trip> tripRepository)
        {
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<TripDto>> Handle(GetTripByIdQuery request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.Query()
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == request.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            return trip.ToDto();
        }
    }

    public class GetTripsByProfileQueryHandler : IRequestHandler<GetTripsByProfileQuery, ErrorOr<List<TripDto>>>
    {
        private readonly IRepository<Trip> _tripRepository;

        public GetTripsByProfileQueryHandler(IRepository<Trip> tripRepository)
        {
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<List<TripDto>>> Handle(GetTripsByProfileQuery request, CancellationToken cancellationToken)
        {
            var trips = await _tripRepository.Query()
                .Where(t => t.ProfileId == request.ProfileId)
                .OrderByDescending(t => t.StartDate)
                .ToListAsync(cancellationToken);

            return trips.Select(t => t.ToDto()).ToList();
        }
    }
}
