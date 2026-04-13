using ErrorOr;
using HSTS.Application.Trips.Dtos;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Trips.Queries
{
    public record GetTripByIdQuery(int TripId) : IRequest<ErrorOr<TripDto>>;
    public record GetTripDetailQuery(int TripId) : IRequest<ErrorOr<TripDetailDto>>;
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
            var trip = await _tripRepository.GetAsync(request.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            return trip.ToDto();
        }
    }

    public class GetTripDetailQueryHandler : IRequestHandler<GetTripDetailQuery, ErrorOr<TripDetailDto>>
    {
        private readonly IRepository<Trip> _tripRepository;

        public GetTripDetailQueryHandler(IRepository<Trip> tripRepository)
        {
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<TripDetailDto>> Handle(GetTripDetailQuery request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.Query()
                .Include(t => t.TripSummary)
                .Include(t => t.TripDays)
                    .ThenInclude(td => td.Activities)
                        .ThenInclude(a => a.Budget)
                .Include(t => t.TripMembers)
                .FirstOrDefaultAsync(t => t.Id == request.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            var tripDays = trip.TripDays
                .OrderBy(td => td.DayNumber)
                .Select(td => new TripDayDto(
                    td.Id,
                    td.DayNumber,
                    td.Date,
                    td.DayTitle,
                    td.WeatherSummary,
                    td.EstimateCost,
                    td.Activities
                        .OrderBy(a => a.StartTime)
                        .Select(a => new TripActivityDto(
                            a.Id,
                            a.Type.ToString(),
                            a.Title,
                            a.StartTime,
                            a.EndTime,
                            a.LocationId,
                            (int)a.Status,
                            a.Budget != null ? new TripActivityBudgetDto(
                                a.Budget.Id,
                                a.Budget.EstimateCost,
                                a.Budget.Title,
                                a.Budget.Description
                            ) : null
                        ))
                        .ToList()
                ))
                .ToList();

            var tripMembers = trip.TripMembers
                .Select(tm => new TripMemberDto(
                    tm.Id,
                    tm.TripId,
                    tm.UserId,
                    tm.Name ?? tm.User?.FullName ?? string.Empty,
                    tm.Role.ToString(),
                    tm.CreatedAt
                ))
                .ToList();

            var tripSummary = trip.TripSummary != null ? new TripSummaryDto(
                trip.TripSummary.Id,
                trip.TripSummary.TotalBudget,
                trip.TripSummary.UsableBudget,
                trip.TripSummary.EstimatedAccommodationCost,
                trip.TripSummary.EstimatedTransportCost,
                trip.TripSummary.EstimatedActivityCost,
                trip.TripSummary.EstimatedMealCost,
                trip.TripSummary.EstimatedTotalCost,
                trip.TripSummary.RemainingBudget,
                trip.TripSummary.ContingencyFund
            ) : null;

            return new TripDetailDto(
                trip.Id,
                trip.TripName,
                trip.Description,
                trip.StartDate,
                trip.EndDate,
                trip.StartingLocation,
                trip.Status,
                trip.Currency,
                trip.CreatedAt,
                trip.JoinCode,
                trip.IsJoinCodeActive,
                tripSummary,
                tripDays,
                tripMembers
            );
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
                .Include(t => t.TripMembers)
                .Where(t => t.TripMembers.Any(tm => tm.UserId == request.ProfileId))
                .OrderByDescending(t => t.StartDate)
                .ToListAsync(cancellationToken);

            return trips.Select(t => t.ToDto()).ToList();
        }
    }
}
