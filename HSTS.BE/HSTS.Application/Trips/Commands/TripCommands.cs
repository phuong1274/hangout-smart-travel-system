using ErrorOr;
using FluentValidation;
using HSTS.Application.Expenses;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Trips.Commands
{
    public record CreateTripCommand(
        string TripName,
        string? Description,
        int ProfileId,
        DateTime StartDate,
        DateTime EndDate,
        int GroupSize,
        string? StartingLocation,
        string Currency,
        TripStatus Status = TripStatus.Planned
    ) : IRequest<ErrorOr<TripDto>>;

    public record UpdateTripCommand(
        int TripId,
        string TripName,
        string? Description,
        DateTime StartDate,
        DateTime EndDate,
        string? StartingLocation,
        string Currency,
        TripStatus Status
    ) : IRequest<ErrorOr<TripDto>>;

    public record DeleteTripCommand(int TripId) : IRequest<ErrorOr<Success>>;

    public class CreateTripCommandValidator : AbstractValidator<CreateTripCommand>
    {
        public CreateTripCommandValidator()
        {
            RuleFor(x => x.TripName).NotEmpty().MaximumLength(200);
            RuleFor(x => x.StartDate).NotEmpty();
            RuleFor(x => x.EndDate).NotEmpty();
            RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate)
                .When(x => x.StartDate != default && x.EndDate != default);
            RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
            RuleFor(x => x.Status).IsInEnum();
        }
    }

    public class UpdateTripCommandValidator : AbstractValidator<UpdateTripCommand>
    {
        public UpdateTripCommandValidator()
        {
            RuleFor(x => x.TripId).GreaterThan(0);
            RuleFor(x => x.TripName).NotEmpty().MaximumLength(200);
            RuleFor(x => x.StartDate).NotEmpty();
            RuleFor(x => x.EndDate).NotEmpty();
            RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate)
                .When(x => x.StartDate != default && x.EndDate != default);
            RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
            RuleFor(x => x.Status).IsInEnum();
        }
    }

    public class CreateTripCommandHandler : IRequestHandler<CreateTripCommand, ErrorOr<TripDto>>
    {
        private readonly IRepository<Trip> _tripRepository;

        public CreateTripCommandHandler(IRepository<Trip> tripRepository)
        {
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<TripDto>> Handle(CreateTripCommand request, CancellationToken cancellationToken)
        {
            var trip = new Trip
            {
                TripName = request.TripName,
                Description = request.Description,
                GroupSize = request.GroupSize,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                StartingLocation = request.StartingLocation,
                Status = request.Status,
                Currency = request.Currency
            };

            await _tripRepository.AddAsync(trip, cancellationToken);

            return trip.ToDto();
        }
    }

    public class UpdateTripCommandHandler : IRequestHandler<UpdateTripCommand, ErrorOr<TripDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public UpdateTripCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<TripDto>> Handle(UpdateTripCommand request, CancellationToken cancellationToken)
        {
            var trip = await _context.Trips
                .Include(t => t.TripMembers)
                .FirstOrDefaultAsync(t => t.Id == request.TripId && !t.IsDeleted, cancellationToken);

            if (trip == null)
                return Error.NotFound("Trip.NotFound", "Trip not found.");

            var isLeader = trip.TripMembers
                .Any(tm => tm.UserId == _currentUser.UserId && tm.Role == TripRole.Leader);

            if (!isLeader)
                return Error.Forbidden("Trip.Forbidden", "Only the trip leader can update this trip.");

            trip.TripName = request.TripName;
            trip.Description = request.Description;
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.StartingLocation = request.StartingLocation;
            trip.Status = request.Status;
            trip.Currency = request.Currency;

            await _context.SaveChangesAsync(cancellationToken);

            return trip.ToDto();
        }
    }

    public class DeleteTripCommandHandler : IRequestHandler<DeleteTripCommand, ErrorOr<Success>>
    {
        private readonly IRepository<Trip> _tripRepository;

        public DeleteTripCommandHandler(IRepository<Trip> tripRepository)
        {
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<Success>> Handle(DeleteTripCommand request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetAsync(request.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            await _tripRepository.DeleteAsync(trip, cancellationToken);

            return Result.Success;
        }
    }
}
