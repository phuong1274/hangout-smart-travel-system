using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ErrorOr;
using FluentValidation;
using HSTS.Application.Common;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Itineraries.Queries
{
    public record EstimateLocalTravelQuery(
        // FROM: priority LocationId > HubId > CustomLocationId > CustomHubId > Lat/Lng
        int? FromLocationId,
        int? FromTransitHubId,
        int? FromCustomLocationId,
        int? FromCustomTransitHubId,
        double? FromLat,
        double? FromLng,

        // TO: priority LocationId > HubId > CustomLocationId > CustomHubId > Lat/Lng
        int? ToLocationId,
        int? ToTransitHubId,
        int? ToCustomLocationId,
        int? ToCustomTransitHubId,
        double? ToLat,
        double? ToLng,

        // Common
        int GroupSize,
        TimeOnly? DepartureTime,
        string CurrencyCode) : IRequest<ErrorOr<LocalTravelEstimateDto>>;

    public class EstimateLocalTravelQueryValidator : AbstractValidator<EstimateLocalTravelQuery>
    {
        public EstimateLocalTravelQueryValidator()
        {
            RuleFor(x => x.GroupSize).GreaterThan(0);
            RuleFor(x => x.CurrencyCode).NotEmpty().MaximumLength(5);

            RuleFor(x => x).Must(x =>
                    x.FromLocationId > 0 || x.FromTransitHubId > 0 ||
                    x.FromCustomLocationId > 0 || x.FromCustomTransitHubId > 0 ||
                    (x.FromLat.HasValue && x.FromLng.HasValue))
                .WithMessage("Either FromLocationId, FromTransitHubId, FromCustomLocationId, FromCustomTransitHubId, or FromLat/FromLng is required.");

            RuleFor(x => x).Must(x =>
                    x.ToLocationId > 0 || x.ToTransitHubId > 0 ||
                    x.ToCustomLocationId > 0 || x.ToCustomTransitHubId > 0 ||
                    (x.ToLat.HasValue && x.ToLng.HasValue))
                .WithMessage("Either ToLocationId, ToTransitHubId, ToCustomLocationId, ToCustomTransitHubId, or ToLat/ToLng is required.");
        }
    }

    public class EstimateLocalTravelQueryHandler : IRequestHandler<EstimateLocalTravelQuery, ErrorOr<LocalTravelEstimateDto>>
    {
        private const double DefaultSpeedKmh = 35.0;
        private const double IntercityThresholdKm = 100.0;

        private readonly IAppDbContext _context;
        private readonly IRouteMatrixService _routeMatrixService;
        private readonly IFixedIntercityTransportService _fixedIntercityTransportService;
        private readonly ICurrencyService _currencyService;

        public EstimateLocalTravelQueryHandler(
            IAppDbContext context,
            IRouteMatrixService routeMatrixService,
            IFixedIntercityTransportService fixedIntercityTransportService,
            ICurrencyService currencyService)
        {
            _context = context;
            _routeMatrixService = routeMatrixService;
            _fixedIntercityTransportService = fixedIntercityTransportService;
            _currencyService = currencyService;
        }

        public async Task<ErrorOr<LocalTravelEstimateDto>> Handle(
            EstimateLocalTravelQuery request,
            CancellationToken cancellationToken)
        {
            // === STEP 1: Currency resolution ===
            decimal vndToTargetRate = 1m;
            string resolvedCurrency = "VND";

            if (!string.Equals(request.CurrencyCode, "VND", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var rates = await _currencyService.GetRatesAsync(cancellationToken);
                    if (rates.TryGetValue("VND", out var vndRate) && vndRate > 0
                        && rates.TryGetValue(request.CurrencyCode.ToUpperInvariant(), out var targetRate) && targetRate > 0)
                    {
                        vndToTargetRate = targetRate / vndRate;
                        resolvedCurrency = request.CurrencyCode.ToUpperInvariant();
                    }
                }
                catch { /* fallback to VND */ }
            }

            MoneyDto toMoney(decimal vndAmount) => new MoneyDto(
                Math.Round(vndAmount * vndToTargetRate, 2), resolvedCurrency, Math.Round(vndAmount, 2), "VND");

            // === STEP 2: Resolve FROM point ===
            var fromResult = await ResolveFromPointAsync(request, cancellationToken);
            if (fromResult.IsError) return fromResult.FirstError;
            var (fromId, fromName, fromLat, fromLng, isFromLatlng) = fromResult.Value;

            // === STEP 3: Resolve TO point ===
            var toResult = await ResolveToPointAsync(request, cancellationToken);
            if (toResult.IsError) return toResult.FirstError;
            var (toId, toName, toLat, toLng, isToLatlng) = toResult.Value;

            // === STEP 4: Calculate distance ===
            var distanceKm = await GetDistanceAsync(fromLat, fromLng, toLat, toLng, cancellationToken);

            // === STEP 5: Determine departure time ===
            var departureTime = request.DepartureTime ?? TimeOnly.FromDateTime(DateTime.Now);

            // === STEP 6: Route to correct handler based on case ===

            // CASE: Hub -> Hub (intercity)
            if (request.FromTransitHubId.HasValue && request.ToTransitHubId.HasValue)
            {
                return await HandleHubToHubAsync(request, fromId, fromName, toId, toName,
                    fromLat, fromLng, toLat, toLng, distanceKm, departureTime, toMoney, cancellationToken);
            }

            // CASE: Intercity travel without explicit hubs (>= 100km)
            if (distanceKm >= IntercityThresholdKm)
            {
                return await HandleIntercityTransportIntelligentlyAsync(request, fromId, fromName, toId, toName,
                    fromLat, fromLng, toLat, toLng, distanceKm, departureTime, toMoney, cancellationToken);
            }

            // CASE: Local travel (< 100km)
            return await HandleLocalTransportAsync(request, fromId, fromName, toId, toName,
                fromLat, fromLng, toLat, toLng, distanceKm, departureTime, toMoney, cancellationToken);
        }

        // === RESOLUTION METHODS ===

        private async Task<ErrorOr<(int id, string name, double lat, double lng, bool isLatlng)>>
            ResolveFromPointAsync(EstimateLocalTravelQuery request, CancellationToken ct)
        {
            if (request.FromLocationId > 0)
            {
                var location = await _context.Locations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == request.FromLocationId, ct);

                if (location is null)
                    return Error.NotFound("Location.NotFound", $"FromLocationId {request.FromLocationId} not found.");

                return (location.Id, location.Name, location.Latitude, location.Longitude, false);
            }

            if (request.FromTransitHubId > 0)
            {
                var hub = await _context.TransitHubs
                    .AsNoTracking()
                    .Include(x => x.TransportMode)
                    .FirstOrDefaultAsync(x => x.Id == request.FromTransitHubId, ct);

                if (hub is null)
                    return Error.NotFound("TransitHub.NotFound", $"FromTransitHubId {request.FromTransitHubId} not found.");

                return (hub.Id, hub.Name, hub.Latitude, hub.Longitude, false);
            }

            if (request.FromCustomLocationId > 0)
            {
                var customLoc = await _context.CustomLocations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == request.FromCustomLocationId, ct);

                if (customLoc is null)
                    return Error.NotFound("CustomLocation.NotFound", $"FromCustomLocationId {request.FromCustomLocationId} not found.");

                return (customLoc.Id, customLoc.Name, customLoc.Latitude, customLoc.Longitude, false);
            }

            if (request.FromCustomTransitHubId > 0)
            {
                var customHub = await _context.CustomTransitHubs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == request.FromCustomTransitHubId, ct);

                if (customHub is null)
                    return Error.NotFound("CustomTransitHub.NotFound", $"FromCustomTransitHubId {request.FromCustomTransitHubId} not found.");

                return (customHub.Id, customHub.Name, customHub.Latitude, customHub.Longitude, false);
            }

            if (request.FromLat.HasValue && request.FromLng.HasValue)
            {
                return (0, "Your Location", request.FromLat.Value, request.FromLng.Value, true);
            }

            return Error.Validation("FromPoint.Required", "A valid from point must be provided.");
        }

        private async Task<ErrorOr<(int id, string name, double lat, double lng, bool isLatlng)>>
            ResolveToPointAsync(EstimateLocalTravelQuery request, CancellationToken ct)
        {
            if (request.ToLocationId > 0)
            {
                var location = await _context.Locations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == request.ToLocationId, ct);

                if (location is null)
                    return Error.NotFound("Location.NotFound", $"ToLocationId {request.ToLocationId} not found.");

                return (location.Id, location.Name, location.Latitude, location.Longitude, false);
            }

            if (request.ToTransitHubId > 0)
            {
                var hub = await _context.TransitHubs
                    .AsNoTracking()
                    .Include(x => x.TransportMode)
                    .FirstOrDefaultAsync(x => x.Id == request.ToTransitHubId, ct);

                if (hub is null)
                    return Error.NotFound("TransitHub.NotFound", $"ToTransitHubId {request.ToTransitHubId} not found.");

                return (hub.Id, hub.Name, hub.Latitude, hub.Longitude, false);
            }

            if (request.ToCustomLocationId > 0)
            {
                var customLoc = await _context.CustomLocations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == request.ToCustomLocationId, ct);

                if (customLoc is null)
                    return Error.NotFound("CustomLocation.NotFound", $"ToCustomLocationId {request.ToCustomLocationId} not found.");

                return (customLoc.Id, customLoc.Name, customLoc.Latitude, customLoc.Longitude, false);
            }

            if (request.ToCustomTransitHubId > 0)
            {
                var customHub = await _context.CustomTransitHubs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == request.ToCustomTransitHubId, ct);

                if (customHub is null)
                    return Error.NotFound("CustomTransitHub.NotFound", $"ToCustomTransitHubId {request.ToCustomTransitHubId} not found.");

                return (customHub.Id, customHub.Name, customHub.Latitude, customHub.Longitude, false);
            }

            if (request.ToLat.HasValue && request.ToLng.HasValue)
            {
                return (0, "Custom Destination", request.ToLat.Value, request.ToLng.Value, true);
            }

            return Error.Validation("ToPoint.Required", "A valid to point must be provided.");
        }

        private async Task<double> GetDistanceAsync(
            double fromLat, double fromLng, double toLat, double toLng, CancellationToken ct)
        {
            RouteEstimate? routeEstimate = null;
            try
            {
                routeEstimate = await _routeMatrixService.EstimateAsync(
                    fromLat, fromLng, toLat, toLng, ct);
            }
            catch { /* route estimate failed, use haversine */ }

            var distanceKm = routeEstimate?.DistanceKm ?? HaversineKm(fromLat, fromLng, toLat, toLng);

            if (double.IsInfinity(distanceKm) || double.IsNaN(distanceKm) || distanceKm > 10_000)
            {
                distanceKm = 50.0;
            }

            return distanceKm;
        }

        // === CASE HANDLERS ===

        private async Task<ErrorOr<LocalTravelEstimateDto>> HandleHubToHubAsync(
            EstimateLocalTravelQuery request,
            int fromId, string fromName, int toId, string toName,
            double fromLat, double fromLng, double toLat, double toLng,
            double distanceKm, TimeOnly departureTime, Func<decimal, MoneyDto> toMoney,
            CancellationToken ct)
        {
            // Fetch full hub info for validation
            var fromHub = await _context.TransitHubs
                .AsNoTracking()
                .Include(x => x.TransportMode)
                .FirstOrDefaultAsync(x => x.Id == request.FromTransitHubId!.Value, ct);

            var toHub = await _context.TransitHubs
                .AsNoTracking()
                .Include(x => x.TransportMode)
                .FirstOrDefaultAsync(x => x.Id == request.ToTransitHubId!.Value, ct);

            if (fromHub is null || toHub is null)
                return Error.NotFound("TransitHub.NotFound", "One or both transit hubs not found.");

            // Verify same transportation type (both bus, both train, or both plane)
            if (fromHub.TransportationId != toHub.TransportationId)
            {
                return Error.Validation(
                    "TransitHub.TypeMismatch",
                    $"From hub '{fromHub.Name}' and to hub '{toHub.Name}' must be the same transportation type.");
            }

            // Determine transport type from TransportMode.Name
            var transportTypeName = fromHub.TransportMode?.Name ?? "";
            var departDate = DateOnly.FromDateTime(DateTime.Today);
            var options = new List<TransportOptionDto>();

            bool IsMatch(string keyword) => transportTypeName.Contains(keyword, StringComparison.OrdinalIgnoreCase);

            // Bus search
            if (IsMatch("Bus"))
            {
                try
                {
                    var busReq = new FixedIntercitySearchRequest(
                        request.FromTransitHubId!.Value, fromLat, fromLng,
                        request.ToTransitHubId!.Value, toLat, toLng,
                        departDate, null, 1, 5);
                    var busResult = await _fixedIntercityTransportService.SearchBusWithDateFallbackAsync(busReq, ct);
                    if (busResult.IsSuccess && busResult.RecommendedOption is not null)
                    {
                        var opt = busResult.RecommendedOption;
                        var mins = opt.EstimatedTravelMinutes > 0 ? opt.EstimatedTravelMinutes : Math.Max(30, (int)(distanceKm / 50.0 * 60));
                        options.Add(new TransportOptionDto(7, "Bus", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                            opt.FromHubId, opt.FromHubName, opt.ToHubId, opt.ToHubName,
                            1, toMoney(opt.EstimatedTotalCost * request.GroupSize), false, busResult.ErrorMessage));
                    }
                }
                catch { /* bus search failed */ }
            }

            // Train search
            if (IsMatch("Train"))
            {
                if (!string.IsNullOrEmpty(fromHub.Code) && !string.IsNullOrEmpty(toHub.Code))
                {
                    try
                    {
                        var trainReq = new TrainRouteSearchRequest(
                            fromHub.Code, toHub.Code, departDate, null, null,
                            request.GroupSize, 0, 0, 0, 0, 1, 5);
                        var trainResult = await _fixedIntercityTransportService.SearchTrainWithDateFallbackAsync(trainReq, ct);
                        if (trainResult.IsSuccess && trainResult.RecommendedOption is not null)
                        {
                            var opt = trainResult.RecommendedOption;
                            var mins = opt.EstimatedTravelMinutes > 0 ? opt.EstimatedTravelMinutes : Math.Max(30, (int)(distanceKm / 50.0 * 60));
                            options.Add(new TransportOptionDto(6, "Train", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                                fromHub.Id, FormatTransitHubName(fromHub, "Train"), toHub.Id, FormatTransitHubName(toHub, "Train"),
                                1, toMoney(opt.EstimatedTotalCost * request.GroupSize), false, trainResult.ErrorMessage));
                        }
                    }
                    catch { /* train search failed */ }
                }
            }

            // Flight search
            if (IsMatch("Plane") || IsMatch("Flight") || IsMatch("Air"))
            {
                if (!string.IsNullOrEmpty(fromHub.Code) && !string.IsNullOrEmpty(toHub.Code))
                {
                    try
                    {
                        var flightReq = new FlightRouteSearchRequest(
                            fromHub.Code, toHub.Code, departDate, null, null,
                            request.GroupSize, 0, 0, 1, 5);
                        var flightResult = await _fixedIntercityTransportService.SearchFlightWithDateFallbackAsync(flightReq, ct);
                        if (flightResult.IsSuccess && flightResult.RecommendedOption is not null)
                        {
                            var opt = flightResult.RecommendedOption;
                            var mins = opt.EstimatedTravelMinutes > 0 ? opt.EstimatedTravelMinutes : Math.Max(30, (int)(distanceKm / 50.0 * 60));
                            options.Add(new TransportOptionDto(5, "Plane", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                                fromHub.Id, FormatTransitHubName(fromHub, "Plane"), toHub.Id, FormatTransitHubName(toHub, "Plane"),
                                1, toMoney(opt.EstimatedTotalCost * request.GroupSize), false, flightResult.ErrorMessage));
                        }
                    }
                    catch { /* flight search failed */ }
                }
            }

            if (options.Count > 0)
            {
                // Mark best as recommended
                var recommended = options.OrderBy(o => o.EstimatedTotalCost.BaseAmount).First();
                var transportOptions = options
                    .Select(o => o with { Recommended = ReferenceEquals(o, recommended) })
                    .ToList();

                var arrivalTime = departureTime.Add(TimeSpan.FromMinutes(recommended.EstimatedTravelMinutes));

                return new LocalTravelEstimateDto(
                    fromId, fromName, toId, toName,
                    departureTime, arrivalTime,
                    Math.Round(distanceKm, 2),
                    recommended.Method, recommended.EstimatedTravelMinutes,
                    recommended.EstimatedTotalCost,
                    transportOptions);
            }

            // All APIs failed → fallback with matching type only
            return FallbackIntercityEstimateByType(
                fromId, fromName, toId, toName, distanceKm, request.GroupSize,
                departureTime, toMoney, transportTypeName);
        }

        private async Task<ErrorOr<LocalTravelEstimateDto>> HandleLocalTransportAsync(
            EstimateLocalTravelQuery request,
            int fromId, string fromName, int toId, string toName,
            double fromLat, double fromLng, double toLat, double toLng,
            double distanceKm, TimeOnly departureTime, Func<decimal, MoneyDto> toMoney,
            CancellationToken ct)
        {
            // For Lat/Lng -> Lat/Lng < 100km, still calculate full local
            var transportModes = await _context.TransportModes
                .AsNoTracking()
                .Include(x => x.LocalTransportMetrics)
                .Where(x => x.Category == CategoryTransport.DynamicLocal && x.LocalTransportMetrics != null)
                .ToListAsync(ct);

            var fallbackDuration = Math.Max(10, (int)Math.Round(distanceKm / DefaultSpeedKmh * 60d));

            var candidates = transportModes
                .Select(x =>
                {
                    var metrics = x.LocalTransportMetrics!;
                    var timeMinutes = TransportUtils.CalculateTravelDuration(distanceKm, metrics.SpeedKmh);
                    var vehicleCount = (int)Math.Ceiling(request.GroupSize / (double)Math.Max(1, x.Capacity));
                    
                    var totalCost = TransportUtils.CalculateLocalTransportCost(
                        metrics.BaseFare,
                        metrics.BaseDistance,
                        metrics.PricePerKm,
                        metrics.LongDistanceThreshold,
                        metrics.LongDistancePricePerKm,
                        metrics.CongestionFeePerMinute,
                        distanceKm,
                        timeMinutes,
                        vehicleCount);

                    var maxDist = metrics.MaxRecommendedDistance.HasValue ? (double)metrics.MaxRecommendedDistance.Value : double.PositiveInfinity;
                    var over = distanceKm - maxDist;
                    
                    double penalty = 0;
                    if (over > 0 && metrics.SpeedKmh < 15) // Only punish Walking/Cycling for long distances
                    {
                        penalty = (double)(over * over * 1000000d);
                    }
                    
                    // EXTRA BONUS FOR WALKING: If distance < 1.5km, give a huge boost to walking (0 cost)
                    if (distanceKm < 1.5 && metrics.SpeedKmh < 8) 
                    {
                        penalty -= 50000; // 50k bonus for choosing to walk short distance
                    }

                    // SCORE LOGIC: 1 minute ~ 1000 VND (Realistic value of time).
                    // This matches the logic in GenerateItineraryQuery.
                    var score = (double)timeMinutes * 1000d + (double)totalCost + penalty;
                    var note = over > 0 ? "Exceeds recommended distance" : "Within recommended distance";

                    return new
                    {
                        TransportModeId = x.Id,
                        Method = x.Name,
                        EstimatedTravelMinutes = timeMinutes,
                        EstimatedTotalCost = totalCost,
                        Score = score,
                        Note = note,
                        VehiclesNeeded = vehicleCount
                    };
                })
                .OrderBy(x => x.Score)
                .ToList();

            var transportOptions = new List<TransportOptionDto>();

            if (candidates.Count == 0)
            {
                var unknownOpt = new TransportOptionDto(0, "Unknown", fallbackDuration, toMoney(0), true,
                    "No local transport data available", null, null, null, null, 1, toMoney(0));
                transportOptions.Add(unknownOpt);
            }
            else
            {
                transportOptions = candidates.Take(4).Select((x, idx) => new TransportOptionDto(
                    x.TransportModeId, x.Method, x.EstimatedTravelMinutes, toMoney(x.EstimatedTotalCost),
                    idx == 0, x.Note, null, null, null, null,
                    x.VehiclesNeeded, toMoney(x.EstimatedTotalCost))).ToList();
            }

            var selectedOption = transportOptions.First(o => o.Recommended);
            var arrivalTime = departureTime.Add(TimeSpan.FromMinutes(selectedOption.EstimatedTravelMinutes));

            return new LocalTravelEstimateDto(
                fromId, fromName, toId, toName,
                departureTime, arrivalTime,
                Math.Round(distanceKm, 2),
                selectedOption.Method, selectedOption.EstimatedTravelMinutes,
                selectedOption.EstimatedTotalCost,
                transportOptions);
        }

        private async Task<ErrorOr<LocalTravelEstimateDto>> HandleIntercityTransportIntelligentlyAsync(
            EstimateLocalTravelQuery request,
            int fromId, string fromName, int toId, string toName,
            double fromLat, double fromLng, double toLat, double toLng,
            double distanceKm, TimeOnly departureTime, Func<decimal, MoneyDto> toMoney,
            CancellationToken ct)
        {
            var transitHubs = await _context.TransitHubs
                .AsNoTracking()
                .Include(x => x.TransportMode)
                .ToListAsync(ct);

            var fromTrainHub = FindNearestHub(transitHubs, fromLat, fromLng, "Train");
            var toTrainHub = FindNearestHub(transitHubs, toLat, toLng, "Train");
            var fromAirport = FindNearestHub(transitHubs, fromLat, fromLng, "Plane");
            var toAirport = FindNearestHub(transitHubs, toLat, toLng, "Plane");
            var fromBusHub = FindNearestHub(transitHubs, fromLat, fromLng, "Bus");
            var toBusHub = FindNearestHub(transitHubs, toLat, toLng, "Bus");

            var departDate = DateOnly.FromDateTime(DateTime.Today);
            var options = new List<TransportOptionDto>();

            var fallbackDuration = Math.Max(10, (int)Math.Round(distanceKm / DefaultSpeedKmh * 60d));

            // Bus search
            try
            {
                var busReq = new FixedIntercitySearchRequest(
                    fromBusHub?.Id, fromLat, fromLng,
                    toBusHub?.Id, toLat, toLng,
                    departDate, null, 1, 5);
                var busResult = await _fixedIntercityTransportService.SearchBusWithDateFallbackAsync(busReq, ct);
                if (busResult.IsSuccess && busResult.RecommendedOption is not null)
                {
                    var opt = busResult.RecommendedOption;
                    var mins = opt.EstimatedTravelMinutes > 0 ? opt.EstimatedTravelMinutes : fallbackDuration;
                    
                    var fm = fromBusHub is not null ? await TryGetLocalTransfer(request, fromId, fromName, fromLat, fromLng, fromBusHub.Id, fromBusHub.Name, fromBusHub.Latitude, fromBusHub.Longitude, departureTime, toMoney, ct) : null;
                    var lm = toBusHub is not null ? await TryGetLocalTransfer(request, toBusHub.Id, toBusHub.Name, toBusHub.Latitude, toBusHub.Longitude, toId, toName, toLat, toLng, departureTime.AddMinutes(mins), toMoney, ct) : null;
                    
                    options.Add(new TransportOptionDto(7, "Bus", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                        opt.FromHubId ?? fromBusHub?.Id, opt.FromHubName ?? FormatTransitHubName(fromBusHub, "Bus"), 
                        opt.ToHubId ?? toBusHub?.Id, opt.ToHubName ?? FormatTransitHubName(toBusHub, "Bus"),
                        1, toMoney(opt.EstimatedTotalCost * request.GroupSize), false, busResult.ErrorMessage, fm, lm));
                }
            }
            catch { /* bus search failed */ }

            // Train search
            if (fromTrainHub is not null && toTrainHub is not null && !string.IsNullOrEmpty(fromTrainHub.Code) && !string.IsNullOrEmpty(toTrainHub.Code))
            {
                try
                {
                    var trainReq = new TrainRouteSearchRequest(
                        fromTrainHub.Code, toTrainHub.Code, departDate, null, null,
                        request.GroupSize, 0, 0, 0, 0, 1, 5);
                    var trainResult = await _fixedIntercityTransportService.SearchTrainWithDateFallbackAsync(trainReq, ct);
                    if (trainResult.IsSuccess && trainResult.RecommendedOption is not null)
                    {
                        var opt = trainResult.RecommendedOption;
                        var mins = opt.EstimatedTravelMinutes > 0 ? opt.EstimatedTravelMinutes : fallbackDuration;
                        
                        var fm = fromTrainHub is not null ? await TryGetLocalTransfer(request, fromId, fromName, fromLat, fromLng, fromTrainHub.Id, fromTrainHub.Name, fromTrainHub.Latitude, fromTrainHub.Longitude, departureTime, toMoney, ct) : null;
                        var lm = toTrainHub is not null ? await TryGetLocalTransfer(request, toTrainHub.Id, toTrainHub.Name, toTrainHub.Latitude, toTrainHub.Longitude, toId, toName, toLat, toLng, departureTime.AddMinutes(mins), toMoney, ct) : null;

                        options.Add(new TransportOptionDto(6, "Train", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                            fromTrainHub.Id, FormatTransitHubName(fromTrainHub, "Train"), toTrainHub.Id, FormatTransitHubName(toTrainHub, "Train"),
                            1, toMoney(opt.EstimatedTotalCost * request.GroupSize), false, trainResult.ErrorMessage, fm, lm));
                    }
                }
                catch { /* train search failed */ }
            }

            // Flight search
            if (fromAirport is not null && toAirport is not null && !string.IsNullOrEmpty(fromAirport.Code) && !string.IsNullOrEmpty(toAirport.Code))
            {
                try
                {
                    var flightReq = new FlightRouteSearchRequest(
                        fromAirport.Code, toAirport.Code, departDate, null, null,
                        request.GroupSize, 0, 0, 1, 5);
                    var flightResult = await _fixedIntercityTransportService.SearchFlightWithDateFallbackAsync(flightReq, ct);
                    if (flightResult.IsSuccess && flightResult.RecommendedOption is not null)
                    {
                        var opt = flightResult.RecommendedOption;
                        var mins = opt.EstimatedTravelMinutes > 0 ? opt.EstimatedTravelMinutes : Math.Max(60, (int)Math.Round(distanceKm / 800.0 * 60.0) + 90);
                        
                        var fm = fromAirport is not null ? await TryGetLocalTransfer(request, fromId, fromName, fromLat, fromLng, fromAirport.Id, fromAirport.Name, fromAirport.Latitude, fromAirport.Longitude, departureTime, toMoney, ct) : null;
                        var lm = toAirport is not null ? await TryGetLocalTransfer(request, toAirport.Id, toAirport.Name, toAirport.Latitude, toAirport.Longitude, toId, toName, toLat, toLng, departureTime.AddMinutes(mins), toMoney, ct) : null;

                        options.Add(new TransportOptionDto(5, "Plane", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                            fromAirport.Id, FormatTransitHubName(fromAirport, "Plane"), toAirport.Id, FormatTransitHubName(toAirport, "Plane"),
                            1, toMoney(opt.EstimatedTotalCost * request.GroupSize), false, flightResult.ErrorMessage, fm, lm));
                    }
                }
                catch { /* flight search failed */ }
            }

            // Bracket fallbacks for missing transport types
            if (!options.Any(o => o.Method.Equals("Bus", StringComparison.OrdinalIgnoreCase)))
            {
                var busDuration = fallbackDuration;
                var fm = fromBusHub is not null ? await TryGetLocalTransfer(request, fromId, fromName, fromLat, fromLng, fromBusHub.Id, fromBusHub.Name, fromBusHub.Latitude, fromBusHub.Longitude, departureTime, toMoney, ct) : null;
                var lm = toBusHub is not null ? await TryGetLocalTransfer(request, toBusHub.Id, toBusHub.Name, toBusHub.Latitude, toBusHub.Longitude, toId, toName, toLat, toLng, departureTime.AddMinutes(busDuration), toMoney, ct) : null;
                options.Add(new TransportOptionDto(7, "Bus", busDuration, toMoney(GetBusBracketCost(distanceKm)), false,
                    "Estimated pricing (API unavailable)", fromBusHub?.Id, FormatTransitHubName(fromBusHub, "Bus") ?? "Nearest Bus Station", toBusHub?.Id, FormatTransitHubName(toBusHub, "Bus") ?? "Nearest Bus Station",
                    1, toMoney(GetBusBracketCost(distanceKm) * request.GroupSize), true, "Estimated bus pricing.", fm, lm));
            }
            if (!options.Any(o => o.Method.Equals("Train", StringComparison.OrdinalIgnoreCase)))
            {
                var trainMins = Math.Max(60, (int)Math.Round(distanceKm / 50.0 * 60.0));
                var fm = fromTrainHub is not null ? await TryGetLocalTransfer(request, fromId, fromName, fromLat, fromLng, fromTrainHub.Id, fromTrainHub.Name, fromTrainHub.Latitude, fromTrainHub.Longitude, departureTime, toMoney, ct) : null;
                var lm = toTrainHub is not null ? await TryGetLocalTransfer(request, toTrainHub.Id, toTrainHub.Name, toTrainHub.Latitude, toTrainHub.Longitude, toId, toName, toLat, toLng, departureTime.AddMinutes(trainMins), toMoney, ct) : null;
                options.Add(new TransportOptionDto(6, "Train", trainMins, toMoney(GetTrainBracketCost(distanceKm)), false,
                    "Estimated pricing (API unavailable)", fromTrainHub?.Id, FormatTransitHubName(fromTrainHub, "Train") ?? "Nearest Train Station", toTrainHub?.Id, FormatTransitHubName(toTrainHub, "Train") ?? "Nearest Train Station",
                    1, toMoney(GetTrainBracketCost(distanceKm) * request.GroupSize), true, "Estimated train pricing.", fm, lm));
            }
            if (!options.Any(o => o.Method.Equals("Plane", StringComparison.OrdinalIgnoreCase)))
            {
                var planeMins = Math.Max(60, (int)Math.Round(distanceKm / 800.0 * 60.0) + 90);
                var fm = fromAirport is not null ? await TryGetLocalTransfer(request, fromId, fromName, fromLat, fromLng, fromAirport.Id, fromAirport.Name, fromAirport.Latitude, fromAirport.Longitude, departureTime, toMoney, ct) : null;
                var lm = toAirport is not null ? await TryGetLocalTransfer(request, toAirport.Id, toAirport.Name, toAirport.Latitude, toAirport.Longitude, toId, toName, toLat, toLng, departureTime.AddMinutes(planeMins), toMoney, ct) : null;
                options.Add(new TransportOptionDto(5, "Plane", planeMins, toMoney(GetPlaneBracketCost(distanceKm)), false,
                    "Estimated pricing (API unavailable)", fromAirport?.Id, FormatTransitHubName(fromAirport, "Plane") ?? "Nearest Airport", toAirport?.Id, FormatTransitHubName(toAirport, "Plane") ?? "Nearest Airport",
                    1, toMoney(GetPlaneBracketCost(distanceKm) * request.GroupSize), true, "Estimated flight pricing.", fm, lm));
            }

            if (options.Count > 0)
            {
                // Recommended by time + speed logic
                var recommended = options
                    .OrderBy(o => o.EstimatedTravelMinutes) // Primary factor: Time
                    .ThenBy(o => o.EstimatedTotalCost.BaseAmount > 0 ? o.EstimatedTotalCost.BaseAmount : decimal.MaxValue)
                    .First();
                
                var transportOptions = options
                    .Select(o => o with { Recommended = ReferenceEquals(o, recommended) })
                    .ToList();

                var arrivalTime = departureTime.Add(TimeSpan.FromMinutes(recommended.EstimatedTravelMinutes));

                return new LocalTravelEstimateDto(
                    fromId, fromName, toId, toName,
                    departureTime, arrivalTime,
                    Math.Round(distanceKm, 2),
                    recommended.Method, recommended.EstimatedTravelMinutes,
                    recommended.EstimatedTotalCost,
                    transportOptions);
            }

            // Fallback (shouldn't be reached because we added brackets)
            return FallbackIntercityEstimateByType(
                fromId, fromName, toId, toName, distanceKm, request.GroupSize,
                departureTime, toMoney, "Bus"); // Generic fallback
        }

        private static TransitHubs? FindNearestHub(List<TransitHubs> hubs, double lat, double lng, string typeKeyword)
        {
            return hubs
                .Where(h => h.TransportMode != null && (h.TransportMode.Name ?? "").Contains(typeKeyword, StringComparison.OrdinalIgnoreCase))
                .OrderBy(h => HaversineKm(lat, lng, h.Latitude, h.Longitude))
                .FirstOrDefault();
        }

        private async Task<LocalTravelEstimateDto?> TryGetLocalTransfer(
            EstimateLocalTravelQuery request,
            int pt1Id, string pt1Name, double pt1Lat, double pt1Lng,
            int pt2Id, string pt2Name, double pt2Lat, double pt2Lng,
            TimeOnly departureTime, Func<decimal, MoneyDto> toMoney, CancellationToken ct)
        {
            var distanceKm = await GetDistanceAsync(pt1Lat, pt1Lng, pt2Lat, pt2Lng, ct);
            if (distanceKm < 0.1) return null; // Too close, no transport needed

            var result = await HandleLocalTransportAsync(request, pt1Id, pt1Name, pt2Id, pt2Name,
                pt1Lat, pt1Lng, pt2Lat, pt2Lng, distanceKm, departureTime, toMoney, ct);

            return result.IsError ? null : result.Value;
        }

        // === HELPER METHODS ===

        private LocalTravelEstimateDto FallbackIntercityEstimateByType(
            int fromId, string fromName, int toId, string toName,
            double distanceKm, int groupSize, TimeOnly departureTime, Func<decimal, MoneyDto> toMoney,
            string transportTypeName)
        {
            // Fallback using same bracket costs as itinerary generation, but only for matching type
            bool IsMatch(string keyword) => transportTypeName.Contains(keyword, StringComparison.OrdinalIgnoreCase);
            var fallbackOptions = new List<TransportOptionDto>();

            // Bus fallback
            if (IsMatch("Bus"))
            {
                var cost = GetBusBracketCost(distanceKm);
                var mins = Math.Max(30, (int)Math.Round(distanceKm / 50.0 * 60));
                fallbackOptions.Add(new TransportOptionDto(
                    7, "Bus", mins, toMoney(cost), true,
                    "Estimated pricing (API unavailable)", null, null, null, null,
                    1, toMoney(cost * groupSize)));
            }

            // Train fallback
            if (IsMatch("Train"))
            {
                var cost = GetTrainBracketCost(distanceKm);
                var mins = Math.Max(60, (int)Math.Round(distanceKm / 50.0 * 60));
                fallbackOptions.Add(new TransportOptionDto(
                    6, "Train", mins, toMoney(cost), true,
                    "Estimated pricing (API unavailable)", null, null, null, null,
                    1, toMoney(cost * groupSize)));
            }

            // Plane fallback
            if (IsMatch("Plane") || IsMatch("Flight") || IsMatch("Air"))
            {
                var cost = GetPlaneBracketCost(distanceKm);
                var mins = Math.Max(60, (int)Math.Round(distanceKm / 800.0 * 60) + 90);
                fallbackOptions.Add(new TransportOptionDto(
                    5, "Plane", mins, toMoney(cost), true,
                    "Estimated pricing (API unavailable)", null, null, null, null,
                    1, toMoney(cost * groupSize)));
            }

            // Ferry fallback
            if (IsMatch("Ferry"))
            {
                var cost = GetBusBracketCost(distanceKm); // Similar to bus pricing
                var mins = Math.Max(30, (int)Math.Round(distanceKm / 30.0 * 60));
                fallbackOptions.Add(new TransportOptionDto(
                    8, "Ferry", mins, toMoney(cost), true,
                    "Estimated pricing (API unavailable)", null, null, null, null,
                    1, toMoney(cost * groupSize)));
            }

            if (fallbackOptions.Count == 0)
            {
                // Unknown type: use generic fallback
                var bracketCost = GetBracketCostPerPerson(distanceKm);
                var bracketMethod = SelectTransportCategory(distanceKm, groupSize);
                fallbackOptions.Add(new TransportOptionDto(
                    0, bracketMethod, Math.Max(30, (int)Math.Round(distanceKm / 50.0 * 60)), toMoney(bracketCost), true,
                    "Estimated pricing (no API results)", null, null, null, null,
                    1, toMoney(bracketCost * groupSize)));
            }

            var selected = fallbackOptions.First();
            var arrivalTime = departureTime.Add(TimeSpan.FromMinutes(selected.EstimatedTravelMinutes));

            return new LocalTravelEstimateDto(
                fromId, fromName, toId, toName,
                departureTime, arrivalTime,
                Math.Round(distanceKm, 2),
                selected.Method, selected.EstimatedTravelMinutes,
                selected.EstimatedTotalCost,
                fallbackOptions);
        }

        private static decimal GetBracketCostPerPerson(double distanceKm)
        {
            if (distanceKm > 1000) return 1_800_000m;
            if (distanceKm > 600) return 1_000_000m;
            if (distanceKm > 300) return 600_000m;
            if (distanceKm > 150) return 400_000m;
            return 200_000m;
        }

        private static decimal GetBusBracketCost(double distanceKm)
        {
            if (distanceKm > 1000) return 800_000m;
            if (distanceKm > 600) return 500_000m;
            if (distanceKm > 300) return 300_000m;
            if (distanceKm > 150) return 200_000m;
            return 100_000m;
        }

        private static decimal GetTrainBracketCost(double distanceKm)
        {
            if (distanceKm > 1000) return 1_200_000m;
            if (distanceKm > 600) return 800_000m;
            if (distanceKm > 300) return 500_000m;
            if (distanceKm > 150) return 350_000m;
            return 200_000m;
        }

        private static decimal GetPlaneBracketCost(double distanceKm)
        {
            if (distanceKm > 1000) return 2_500_000m;
            if (distanceKm > 600) return 1_800_000m;
            if (distanceKm > 300) return 1_200_000m;
            return 900_000m;
        }

        private static string SelectTransportCategory(double distanceKm, int groupSize)
        {
            if (distanceKm > 1000) return "Airplane";
            if (distanceKm > 600) return groupSize > 4 ? "Airplane" : "Train";
            if (distanceKm > 300) return "Train";
            return "Bus";
        }

        private static string? FormatTransitHubName(TransitHubs? hub, string method)
        {
            if (hub is null) return null;
            // Bus: name only; Train/Plane: CODE - Name
            var typeName = hub.TransportMode?.Name?.ToLowerInvariant() ?? "";
            if (typeName.Contains("bus"))
                return hub.Name;
            return string.IsNullOrEmpty(hub.Code) ? hub.Name : $"{hub.Code} - {hub.Name}";
        }

        private static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
        {
            const double earthRadiusKm = 6371.0;
            var dLat = ToRadians(lat2 - lat1);
            var dLng = ToRadians(lng2 - lng1);
            var aa = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                     + Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2))
                     * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(aa), Math.Sqrt(1 - aa));
            return earthRadiusKm * c;
        }

        private static double ToRadians(double degree) => degree * (Math.PI / 180d);
    }
}
