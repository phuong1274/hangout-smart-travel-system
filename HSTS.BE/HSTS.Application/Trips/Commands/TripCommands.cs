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
            RuleFor(x => x.ProfileId).GreaterThan(0);
            RuleFor(x => x.StartDate).NotEmpty();
            RuleFor(x => x.EndDate).NotEmpty();
            RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate)
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
            RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate)
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
                ProfileId = request.ProfileId,
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
        private readonly IRepository<Trip> _tripRepository;

        public UpdateTripCommandHandler(IRepository<Trip> tripRepository)
        {
            _tripRepository = tripRepository;
        }

        public async Task<ErrorOr<TripDto>> Handle(UpdateTripCommand request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetAsync(request.TripId, cancellationToken);

            if (trip == null)
            {
                return Error.NotFound("Trip.NotFound", "Trip not found.");
            }

            trip.TripName = request.TripName;
            trip.Description = request.Description;
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.StartingLocation = request.StartingLocation;
            trip.Status = request.Status;
            trip.Currency = request.Currency;

            await _tripRepository.UpdateAsync(trip, cancellationToken);

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
