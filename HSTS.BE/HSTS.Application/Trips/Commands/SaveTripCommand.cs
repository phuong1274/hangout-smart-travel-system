using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Application.Trips.Dtos;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Trips.Commands
{
    // ==================== COMMAND ====================
    public record SaveTripCommand(SaveTripRequest Request)
        : IRequest<ErrorOr<int>>;

    // ==================== VALIDATOR ====================
    public class SaveTripCommandValidator : AbstractValidator<SaveTripCommand>
    {
        public SaveTripCommandValidator()
        {
            RuleFor(x => x.Request.TripName)
                .NotEmpty().WithMessage("Trip name is required.")
                .MaximumLength(200).WithMessage("Trip name must not exceed 200 characters.");

            RuleFor(x => x.Request.Description)
                .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.")
                .When(x => !string.IsNullOrEmpty(x.Request.Description));

            RuleFor(x => x.Request.StartDate)
                .NotEmpty().WithMessage("Start date is required.");

            RuleFor(x => x.Request.EndDate)
                .NotEmpty().WithMessage("End date is required.")
                .GreaterThan(x => x.Request.StartDate)
                .WithMessage("End date must be after start date.");

            RuleFor(x => x.Request.GroupSize)
                .GreaterThan(0).WithMessage("Group size must be greater than 0.")
                .LessThanOrEqualTo(100).WithMessage("Group size must not exceed 100.");

            RuleFor(x => x.Request.CurrencyCode)
                .NotEmpty().WithMessage("Currency code is required.")
                .Length(3).WithMessage("Currency code must be exactly 3 characters (ISO 4217).");

            RuleFor(x => x.Request.Days)
                .NotEmpty().WithMessage("Trip must have at least one day.");

            RuleForEach(x => x.Request.Days).ChildRules(day =>
            {
                day.RuleFor(d => d.DayNumber)
                    .GreaterThan(0).WithMessage("Day number must be greater than 0.");

                day.RuleFor(d => d.Date)
                    .NotEmpty().WithMessage("Day date is required.");

                day.RuleFor(d => d.DayTitle)
                    .NotEmpty().WithMessage("Day title is required.")
                    .MaximumLength(200).WithMessage("Day title must not exceed 200 characters.");

                day.RuleFor(d => d.WeatherSummary)
                    .MaximumLength(200).WithMessage("Weather summary must not exceed 200 characters.")
                    .When(d => !string.IsNullOrEmpty(d.WeatherSummary));

                day.RuleFor(d => d.EstimatedCost)
                    .GreaterThanOrEqualTo(0).WithMessage("Estimated cost must be non-negative.");

                day.RuleFor(d => d.Activities)
                    .NotEmpty().WithMessage("Each day must have at least one activity.");

                day.RuleForEach(d => d.Activities).ChildRules(act =>
                {
                    act.RuleFor(a => a.Type)
                        .IsInEnum().WithMessage("Invalid activity type.");

                    act.RuleFor(a => a.Title)
                        .NotEmpty().WithMessage("Activity title is required.")
                        .MaximumLength(500).WithMessage("Activity title must not exceed 500 characters.");

                    act.RuleFor(a => a.StartTime)
                        .LessThan(a => a.EndTime)
                        .WithMessage("Start time must be before end time.")
                        .When(a => a.StartTime.HasValue && a.EndTime.HasValue);

                    act.RuleFor(a => a.LocationId)
                        .GreaterThan(0).WithMessage("LocationId must be greater than 0.")
                        .When(a => a.LocationId.HasValue);

                    // CustomLocation validation (auto-create)
                    act.RuleFor(a => a.CustomLocation).ChildRules(cl =>
                    {
                        cl.RuleFor(x => x.Name)
                            .NotEmpty().WithMessage("Custom location name is required.")
                            .MaximumLength(200).WithMessage("Name must not exceed 200 characters.");

                        cl.RuleFor(x => x.Latitude)
                            .InclusiveBetween(-90, 90).WithMessage("Latitude must be between -90 and 90.");

                        cl.RuleFor(x => x.Longitude)
                            .InclusiveBetween(-180, 180).WithMessage("Longitude must be between -180 and 180.");

                        cl.RuleFor(x => x.Address)
                            .MaximumLength(500).WithMessage("Address must not exceed 500 characters.")
                            .When(x => !string.IsNullOrEmpty(x.Address));
                    }).When(a => a.CustomLocation != null);

                    // Validate mutually exclusive: LocationId vs CustomLocationId vs CustomLocation
                    act.RuleFor(a => a)
                        .Must(a => new[] { a.LocationId.HasValue, a.CustomLocationId.HasValue, a.CustomLocation != null }.Count(x => x) <= 1)
                        .WithMessage("Cannot specify both LocationId, CustomLocationId, and CustomLocation. Choose one.");

                    // Transport validation
                    act.RuleFor(a => a.Transport).ChildRules(t =>
                    {
                        t.RuleFor(x => x.DistanceKm)
                            .GreaterThanOrEqualTo(0).WithMessage("Distance must be non-negative.");

                        t.RuleFor(x => x.TravelTimeMinutes)
                            .GreaterThan(0).WithMessage("Travel time must be greater than 0 minutes.");

                        t.RuleFor(x => x.TransportModeId)
                            .GreaterThan(0).WithMessage("TransportModeId must be greater than 0.")
                            .When(x => x.TransportModeId.HasValue);

                        t.RuleFor(x => x.FromLocationId)
                            .GreaterThan(0).WithMessage("FromLocationId must be greater than 0.")
                            .When(x => x.FromLocationId.HasValue);

                        t.RuleFor(x => x.ToLocationId)
                            .GreaterThan(0).WithMessage("ToLocationId must be greater than 0.")
                            .When(x => x.ToLocationId.HasValue);

                        t.RuleFor(x => x.FromTransitHubId)
                            .GreaterThan(0).WithMessage("FromTransitHubId must be greater than 0.")
                            .When(x => x.FromTransitHubId.HasValue);

                        t.RuleFor(x => x.ToTransitHubId)
                            .GreaterThan(0).WithMessage("ToTransitHubId must be greater than 0.")
                            .When(x => x.ToTransitHubId.HasValue);

                        t.RuleFor(x => x.CustomFromTransitHubId)
                            .GreaterThan(0).WithMessage("CustomFromTransitHubId must be greater than 0.")
                            .When(x => x.CustomFromTransitHubId.HasValue);

                        t.RuleFor(x => x.CustomToTransitHubId)
                            .GreaterThan(0).WithMessage("CustomToTransitHubId must be greater than 0.")
                            .When(x => x.CustomToTransitHubId.HasValue);

                        // CustomFromTransitHub validation (auto-create)
                        t.RuleFor(x => x.CustomFromTransitHub).ChildRules(ch =>
                        {
                            ch.RuleFor(x => x.Name)
                                .NotEmpty().WithMessage("Custom transit hub name is required.")
                                .MaximumLength(200).WithMessage("Name must not exceed 200 characters.");

                            ch.RuleFor(x => x.Latitude)
                                .InclusiveBetween(-90, 90).WithMessage("Latitude must be between -90 and 90.");

                            ch.RuleFor(x => x.Longitude)
                                .InclusiveBetween(-180, 180).WithMessage("Longitude must be between -180 and 180.");

                            ch.RuleFor(x => x.Address)
                                .MaximumLength(500).WithMessage("Address must not exceed 500 characters.")
                                .When(x => !string.IsNullOrEmpty(x.Address));
                        }).When(x => x.CustomFromTransitHub != null);

                        // CustomToTransitHub validation (auto-create)
                        t.RuleFor(x => x.CustomToTransitHub).ChildRules(ch =>
                        {
                            ch.RuleFor(x => x.Name)
                                .NotEmpty().WithMessage("Custom transit hub name is required.")
                                .MaximumLength(200).WithMessage("Name must not exceed 200 characters.");

                            ch.RuleFor(x => x.Latitude)
                                .InclusiveBetween(-90, 90).WithMessage("Latitude must be between -90 and 90.");

                            ch.RuleFor(x => x.Longitude)
                                .InclusiveBetween(-180, 180).WithMessage("Longitude must be between -180 and 180.");

                            ch.RuleFor(x => x.Address)
                                .MaximumLength(500).WithMessage("Address must not exceed 500 characters.")
                                .When(x => !string.IsNullOrEmpty(x.Address));
                        }).When(x => x.CustomToTransitHub != null);

                        // Validate from/to mutually exclusive
                        t.RuleFor(x => x)
                            .Must(x => new[] { x.FromLocationId.HasValue, x.FromTransitHubId.HasValue, x.CustomFromTransitHubId.HasValue, x.CustomFromTransitHub != null }.Count(v => v) <= 1)
                            .WithMessage("Cannot specify multiple From location/hub types. Choose one.");

                        t.RuleFor(x => x)
                            .Must(x => new[] { x.ToLocationId.HasValue, x.ToTransitHubId.HasValue, x.CustomToTransitHubId.HasValue, x.CustomToTransitHub != null }.Count(v => v) <= 1)
                            .WithMessage("Cannot specify multiple To location/hub types. Choose one.");
                    }).When(a => a.Transport != null);

                    // Budget validation
                    act.RuleFor(a => a.Budget).ChildRules(b =>
                    {
                        b.RuleFor(x => x.EstimateCost)
                            .GreaterThanOrEqualTo(0).WithMessage("Estimate cost must be non-negative.");
                    }).When(a => a.Budget != null);
                });
            });

            // BudgetSummary validation
            RuleFor(x => x.Request.BudgetSummary).ChildRules(summary =>
            {
                summary.RuleFor(x => x.TotalBudget)
                    .GreaterThanOrEqualTo(0).WithMessage("Total budget must be non-negative.");

                summary.RuleFor(x => x.UsableBudget)
                    .GreaterThanOrEqualTo(0).WithMessage("Usable budget must be non-negative.")
                    .LessThanOrEqualTo(x => x.TotalBudget)
                    .WithMessage("Usable budget cannot exceed total budget.");

                summary.RuleFor(x => x.EstimatedAccommodationCost)
                    .GreaterThanOrEqualTo(0).WithMessage("Estimated accommodation cost must be non-negative.");

                summary.RuleFor(x => x.EstimatedTransportCost)
                    .GreaterThanOrEqualTo(0).WithMessage("Estimated transport cost must be non-negative.");

                summary.RuleFor(x => x.EstimatedActivityCost)
                    .GreaterThanOrEqualTo(0).WithMessage("Estimated activity cost must be non-negative.");

                summary.RuleFor(x => x.EstimatedMealCost)
                    .GreaterThanOrEqualTo(0).WithMessage("Estimated meal cost must be non-negative.");

                summary.RuleFor(x => x.EstimatedTotalCost)
                    .GreaterThanOrEqualTo(0).WithMessage("Estimated total cost must be non-negative.");

                summary.RuleFor(x => x.RemainingBudget)
                    .GreaterThanOrEqualTo(0).WithMessage("Remaining budget must be non-negative.");

                summary.RuleFor(x => x.ContingencyFund)
                    .GreaterThanOrEqualTo(0).WithMessage("Contingency fund must be non-negative.")
                    .When(x => x.ContingencyFund.HasValue);
            });
        }
    }

    // ==================== HANDLER ====================
    public class SaveTripCommandHandler : IRequestHandler<SaveTripCommand, ErrorOr<int>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public SaveTripCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<int>> Handle(
            SaveTripCommand command,
            CancellationToken cancellationToken)
        {
            var req = command.Request;

            // 1. Validate user exists
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);

            if (user == null)
                return Error.NotFound("User.NotFound", "User not found.");

            // 2. Validate LocationId references exist
            var locationIds = req.Days
                .SelectMany(d => d.Activities)
                .Where(a => a.LocationId.HasValue)
                .Select(a => a.LocationId!.Value)
                .Distinct()
                .ToList();

            if (locationIds.Any())
            {
                var existingLocationIds = await _context.Locations
                    .Where(l => locationIds.Contains(l.Id))
                    .Select(l => l.Id)
                    .ToListAsync(cancellationToken);

                var invalidLocationIds = locationIds.Except(existingLocationIds).ToList();
                if (invalidLocationIds.Any())
                    return Error.Validation("Location.InvalidId",
                        $"Location IDs not found: {string.Join(", ", invalidLocationIds)}");
            }

            // 3. Validate TransportModeId references exist
            var transportModeIds = req.Days
                .SelectMany(d => d.Activities)
                .Where(a => a.Transport != null && a.Transport.TransportModeId.HasValue)
                .Select(a => a.Transport!.TransportModeId!.Value)
                .Distinct()
                .ToList();

            if (transportModeIds.Any())
            {
                var existingTransportModeIds = await _context.TransportModes
                    .Where(tm => transportModeIds.Contains(tm.Id))
                    .Select(tm => tm.Id)
                    .ToListAsync(cancellationToken);

                var invalidTransportModeIds = transportModeIds.Except(existingTransportModeIds).ToList();
                if (invalidTransportModeIds.Any())
                    return Error.Validation("TransportMode.InvalidId",
                        $"Transport Mode IDs not found: {string.Join(", ", invalidTransportModeIds)}");
            }

            // 4. Validate TransitHubId references exist
            var fromTransitHubIds = req.Days
                .SelectMany(d => d.Activities)
                .Where(a => a.Transport != null && a.Transport.FromTransitHubId.HasValue)
                .Select(a => a.Transport!.FromTransitHubId!.Value)
                .Distinct()
                .ToList();

            var toTransitHubIds = req.Days
                .SelectMany(d => d.Activities)
                .Where(a => a.Transport != null && a.Transport.ToTransitHubId.HasValue)
                .Select(a => a.Transport!.ToTransitHubId!.Value)
                .Distinct()
                .ToList();

            var allTransitHubIds = fromTransitHubIds.Concat(toTransitHubIds).Distinct().ToList();

            if (allTransitHubIds.Any())
            {
                var existingTransitHubIds = await _context.TransitHubs
                    .Where(th => allTransitHubIds.Contains(th.Id))
                    .Select(th => th.Id)
                    .ToListAsync(cancellationToken);

                var invalidTransitHubIds = allTransitHubIds.Except(existingTransitHubIds).ToList();
                if (invalidTransitHubIds.Any())
                    return Error.Validation("TransitHub.InvalidId",
                        $"Transit Hub IDs not found: {string.Join(", ", invalidTransitHubIds)}");
            }

            // 5. Validate From/To Location IDs exist in Transport
            var transportFromLocationIds = req.Days
                .SelectMany(d => d.Activities)
                .Where(a => a.Transport != null && a.Transport.FromLocationId.HasValue)
                .Select(a => a.Transport!.FromLocationId!.Value)
                .Distinct()
                .ToList();

            var transportToLocationIds = req.Days
                .SelectMany(d => d.Activities)
                .Where(a => a.Transport != null && a.Transport.ToLocationId.HasValue)
                .Select(a => a.Transport!.ToLocationId!.Value)
                .Distinct()
                .ToList();

            var allTransportLocationIds = transportFromLocationIds.Concat(transportToLocationIds).Distinct().ToList();

            if (allTransportLocationIds.Any())
            {
                var existingTransportLocationIds = await _context.Locations
                    .Where(l => allTransportLocationIds.Contains(l.Id))
                    .Select(l => l.Id)
                    .ToListAsync(cancellationToken);

                var invalidTransportLocationIds = allTransportLocationIds.Except(existingTransportLocationIds).ToList();
                if (invalidTransportLocationIds.Any())
                    return Error.Validation("TransportLocation.InvalidId",
                        $"Transport Location IDs not found: {string.Join(", ", invalidTransportLocationIds)}");
            }

            // 6. Dùng transaction để đảm bảo atomicity
            using var transaction = await _context.BeginTransactionAsync(cancellationToken);

            try
            {
                // 7. Tạo Trip entity
                var trip = new Trip
                {
                    TripName = req.TripName,
                    Description = req.Description,
                    StartDate = req.StartDate,
                    EndDate = req.EndDate,
                    GroupSize = req.GroupSize,
                    Currency = req.CurrencyCode,
                    Status = TripStatus.Planned,
                };

                // 8. Save Trip trước để có Id
                _context.Trips.Add(trip);
                await _context.SaveChangesAsync(cancellationToken);

                // 9. Tạo TripMember với TripId đã có
                var tripMember = new TripMember
                {
                    TripId = trip.Id,
                    UserId = _currentUser.UserId,
                    Name = user.FullName,
                    Role = TripMemberRole.ADMIN
                };
                _context.TripMembers.Add(tripMember);
                await _context.SaveChangesAsync(cancellationToken);

                // 10. Tạo TripDays → Activities
                foreach (var dayReq in req.Days)
                {
                    var tripDay = new TripDay
                    {
                        TripId = trip.Id,
                        DayNumber = dayReq.DayNumber,
                        Date = dayReq.Date,
                        DayTitle = dayReq.DayTitle,
                        WeatherSummary = dayReq.WeatherSummary,
                        EstimateCost = dayReq.EstimatedCost,
                        Activities = new List<TripActivity>()
                    };

                    // 11. Tạo Activities cho mỗi ngày
                    foreach (var actReq in dayReq.Activities)
                    {
                        var activity = new TripActivity
                        {
                            Type = actReq.Type,
                            Title = actReq.Title,
                            StartTime = actReq.StartTime,
                            EndTime = actReq.EndTime,
                            LocationId = actReq.LocationId,
                        };

                        // 12. Xử lý CustomLocation (auto-create nếu có)
                        if (actReq.CustomLocation != null)
                        {
                            var customLocation = new CustomLocation
                            {
                                Name = actReq.CustomLocation.Name,
                                Latitude = actReq.CustomLocation.Latitude,
                                Longitude = actReq.CustomLocation.Longitude,
                                Address = actReq.CustomLocation.Address
                            };
                            _context.CustomLocations.Add(customLocation);
                            await _context.SaveChangesAsync(cancellationToken);
                            activity.CustomLocationId = customLocation.Id;
                        }
                        else if (actReq.CustomLocationId.HasValue)
                        {
                            activity.CustomLocationId = actReq.CustomLocationId.Value;
                        }

                        // 13. Tạo Transport (nếu có)
                        if (actReq.Transport != null)
                        {
                            var t = actReq.Transport;
                            var transport = new TripTransport
                            {
                                TransportModeId = t.TransportModeId,
                                DistanceKm = t.DistanceKm,
                                TravelTimeMinutes = t.TravelTimeMinutes,
                                FromLocationId = t.FromLocationId,
                                ToLocationId = t.ToLocationId,
                                FromTransitHubId = t.FromTransitHubId,
                                ToTransitHubId = t.ToTransitHubId,
                            };

                            // 14. Xử lý CustomFromTransitHub (auto-create nếu có)
                            if (t.CustomFromTransitHub != null)
                            {
                                var customHub = new CustomTransitHub
                                {
                                    Name = t.CustomFromTransitHub.Name,
                                    Latitude = t.CustomFromTransitHub.Latitude,
                                    Longitude = t.CustomFromTransitHub.Longitude,
                                    Address = t.CustomFromTransitHub.Address
                                };
                                _context.CustomTransitHubs.Add(customHub);
                                await _context.SaveChangesAsync(cancellationToken);
                                transport.CustomFromTransitHubId = customHub.Id;
                            }
                            else if (t.CustomFromTransitHubId.HasValue)
                            {
                                transport.CustomFromTransitHubId = t.CustomFromTransitHubId.Value;
                            }

                            // 15. Xử lý CustomToTransitHub (auto-create nếu có)
                            if (t.CustomToTransitHub != null)
                            {
                                var customHub = new CustomTransitHub
                                {
                                    Name = t.CustomToTransitHub.Name,
                                    Latitude = t.CustomToTransitHub.Latitude,
                                    Longitude = t.CustomToTransitHub.Longitude,
                                    Address = t.CustomToTransitHub.Address
                                };
                                _context.CustomTransitHubs.Add(customHub);
                                await _context.SaveChangesAsync(cancellationToken);
                                transport.CustomToTransitHubId = customHub.Id;
                            }
                            else if (t.CustomToTransitHubId.HasValue)
                            {
                                transport.CustomToTransitHubId = t.CustomToTransitHubId.Value;
                            }

                            activity.Transport = transport;
                        }

                        // 16. Tạo Budget (nếu có)
                        if (actReq.Budget != null)
                        {
                            activity.Budget = new TripActivityBudget
                            {
                                EstimateCost = actReq.Budget.EstimateCost,
                                Title = null,
                                Description = null
                            };
                        }

                        tripDay.Activities.Add(activity);
                    }

                    _context.TripDays.Add(tripDay);
                }

                // 17. Tạo TripSummary
                var summary = req.BudgetSummary;
                var tripSummary = new TripSummary
                {
                    TripId = trip.Id,
                    TotalBudget = summary.TotalBudget,
                    UsableBudget = summary.UsableBudget,
                    EstimatedAccommodationCost = summary.EstimatedAccommodationCost,
                    EstimatedTransportCost = summary.EstimatedTransportCost,
                    EstimatedActivityCost = summary.EstimatedActivityCost,
                    EstimatedMealCost = summary.EstimatedMealCost,
                    EstimatedTotalCost = summary.EstimatedTotalCost,
                    RemainingBudget = summary.RemainingBudget,
                    ContingencyFund = summary.ContingencyFund
                };
                _context.TripSummaries.Add(tripSummary);

                // 18. Final save
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return trip.Id;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                return Error.Unexpected("Trip.SaveError", $"Failed to save trip: {ex.Message}");
            }
        }
    }
}
