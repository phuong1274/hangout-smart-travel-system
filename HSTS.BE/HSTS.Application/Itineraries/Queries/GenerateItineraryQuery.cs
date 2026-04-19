using System.Globalization;
using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Itineraries.Queries
{
    // --- Request Models ---

    public class UserLocation
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    public class DestinationRequest
    {
        public int ProvinceId { get; set; }
        public List<int>? DistrictIds { get; set; }
    }

    public class TripPlanRequest
    {
        public UserLocation UserLocation { get; set; } = null!;
        public List<DestinationRequest> Destinations { get; set; } = new();
        public List<int> UserFavoriteTagIds { get; set; } = new();
        public string CurrencyCode { get; set; } = "VND";
        public int GroupSize { get; set; }
        public int? MinimumAge { get; set; }
        public decimal TotalBudget { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public string? HotelPreference { get; set; }
        public string TripSegment { get; set; } = "Standard";
        public bool IsContingencyNeeded { get; set; } = true;
    }

    // --- MediatR Query ---

    public record GenerateItineraryQuery(TripPlanRequest Request)
        : IRequest<ErrorOr<GeneratedItineraryDto>>;


    

    // --- Validator ---

    public class GenerateItineraryQueryValidator : AbstractValidator<GenerateItineraryQuery>
    {
        public GenerateItineraryQueryValidator()
        {
            RuleFor(x => x.Request).NotNull();
            RuleFor(x => x.Request.UserLocation).NotNull().WithMessage("UserLocation is required.");
            RuleFor(x => x.Request.UserLocation.Latitude).InclusiveBetween(-90, 90).When(x => x.Request.UserLocation is not null);
            RuleFor(x => x.Request.UserLocation.Longitude).InclusiveBetween(-180, 180).When(x => x.Request.UserLocation is not null);
            RuleFor(x => x.Request.Destinations).NotEmpty().WithMessage("At least one destination is required.");
            RuleFor(x => x.Request.EndDate)
                .GreaterThanOrEqualTo(x => x.Request.StartDate)
                .WithMessage("EndDate must be >= StartDate.");
            RuleFor(x => x.Request.GroupSize).GreaterThan(0);
            RuleFor(x => x.Request.MinimumAge)
                .GreaterThanOrEqualTo(0)
                .When(x => x.Request.MinimumAge.HasValue);
            RuleFor(x => x.Request.TotalBudget).GreaterThan(0)
                .WithMessage("TotalBudget must be > 0.");
            RuleFor(x => x.Request.CurrencyCode).NotEmpty().MaximumLength(5);
            RuleFor(x => x.Request.HotelPreference)
                .Must(x => x is null or "Budget" or "Standard" or "Luxury")
                .WithMessage("HotelPreference must be null, Budget, Standard, or Luxury.");
            RuleFor(x => x.Request.TripSegment)
                .Must(x => x is "Budget" or "Standard" or "Luxury")
                .WithMessage("TripSegment must be Budget, Standard, or Luxury.");
        }
    }
    // --- Handler ---

    public class GenerateItineraryQueryHandler : IRequestHandler<GenerateItineraryQuery, ErrorOr<GeneratedItineraryDto>>
    {
        private const int MinStayMinutes = 45;
        private const int DefaultStayMinutes = 90;
        private const double DefaultSpeedKmh = 35.0;
        private const double FirstMileIntercityThresholdKm = 100.0;

        private static readonly HashSet<string> IndoorTagKeywords = new(StringComparer.OrdinalIgnoreCase)
            { "museum", "restaurant", "shopping", "spa", "cafe", "mall", "cinema", "theater" };
        private static readonly HashSet<string> OutdoorTagKeywords = new(StringComparer.OrdinalIgnoreCase)
            { "park", "beach", "hiking", "waterfall", "garden", "mountain", "lake", "camping" };

        private static readonly TimeOnly BreakfastStart = new(6, 0);
        private static readonly TimeOnly BreakfastEnd = new(8, 30);
        private static readonly TimeOnly LunchStart = new(11, 30);
        private static readonly TimeOnly LunchEnd = new(13, 30);
        private static readonly TimeOnly DinnerStart = new(17, 30);
        private static readonly TimeOnly DinnerEnd = new(20, 30);

        // Post-dinner activity cutoff: activities after dinner must end before 22:00
        private static readonly TimeOnly PostDinnerActivityEnd = new(22, 0);

        // === MEAL BUDGET ALLOCATION WEIGHTS ===
        private const decimal BreakfastWeight = 0.20m; // 20% of daily meal budget
        private const decimal LunchWeight = 0.35m;     // 35% of daily meal budget
        private const decimal DinnerWeight = 0.45m;    // 45% of daily meal budget
        private const decimal MealBudgetShare = 0.25m; // 25% of usable budget goes to meals

        // === BUFFER / GAP CONFIGURATION ===
        private const int BufferBeforeFlightDeparture = 120;  // 2 hours: check-in + security
        private const int BufferBeforeTrainDeparture = 45;    // 45 min: buy ticket + board
        private const int BufferBeforeBusDeparture = 30;      // 30 min: board the bus
        private const int BufferAfterLocalTransfer = 10;      // 10 min: walk to next point
        private const int BufferAfterIntercityArrival = 20;   // 20 min: exit station/airport
        private const int BufferAfterMeal = 15;               // 15 min: pay bill + leave
        private const int BufferAfterActivity = 15;           // 15 min: rest + light transfer
        private const int BufferAfterHotelReturn = 10;        // 10 min: short rest at hotel

        private readonly IAppDbContext _context;
        private readonly IRouteMatrixService _routeMatrixService;
        private readonly IWeatherAdvisoryService _weatherAdvisoryService;
        private readonly IFixedIntercityTransportService _fixedIntercityTransportService;
        private readonly ICurrencyService _currencyService;
        private readonly ICurrentUserService _currentUserService;

        public GenerateItineraryQueryHandler(
            IAppDbContext context,
            IRouteMatrixService routeMatrixService,
            IWeatherAdvisoryService weatherAdvisoryService,
            IFixedIntercityTransportService fixedIntercityTransportService,
            ICurrencyService currencyService,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _routeMatrixService = routeMatrixService;
            _weatherAdvisoryService = weatherAdvisoryService;
            _fixedIntercityTransportService = fixedIntercityTransportService;
            _currencyService = currencyService;
            _currentUserService = currentUserService;
        }

        public async Task<ErrorOr<GeneratedItineraryDto>> Handle(
            GenerateItineraryQuery query,
            CancellationToken cancellationToken)
        {
            var request = query.Request;
            var notes = new List<string>();
            bool hasHotelPreference = !string.IsNullOrWhiteSpace(request.HotelPreference);

            // === RECENTLY VISITED LOCATIONS (for penalty in scoring) ===
            var userId = _currentUserService.UserId;
            HashSet<int> recentlyVisitedLocationIds = new();
            bool shouldAvoidDuplicates = userId > 0;

            if (shouldAvoidDuplicates)
            {
                try
                {
                    var nonTerminalStatus = new[] { TripStatus.Planned, TripStatus.InProgress, TripStatus.Completed };
                    recentlyVisitedLocationIds = await _context.Trips
                        .Where(t => t.TripMembers.Any(tm => tm.UserId == userId) && nonTerminalStatus.Contains(t.Status))
                        .OrderByDescending(t => t.StartDate)
                        .Take(3)
                        .SelectMany(t => t.TripDays)
                        .SelectMany(td => td.Activities)
                        .Where(ta => ta.LocationId.HasValue)
                        .Select(ta => ta.LocationId!.Value)
                        .Distinct()
                        .ToHashSetAsync(cancellationToken);
                }
                catch { }
            }

            // Pre-fetch exchange rate for sync currency conversion
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

            // STAGE 1: Validation and Data Loading
            var totalDays = request.EndDate.DayNumber - request.StartDate.DayNumber + 1;
            if (totalDays <= 0)
                return Error.Validation("Itinerary.Dates", "Trip duration is invalid.");

            var groupSize = request.GroupSize;
            var isLuxuryTrip = ClassifyBudgetLevel(request.TotalBudget, groupSize, totalDays) == "Luxury";

            var destinationProvinceIds = request.Destinations.Select(d => d.ProvinceId).Distinct().ToList();
            var destinationProvinces = await _context.Provinces
                .AsNoTracking()
                .Where(p => destinationProvinceIds.Contains(p.Id))
                .ToListAsync(cancellationToken);

            if (destinationProvinces.Count == 0)
                return Error.Validation("Itinerary.Destinations", "No valid destination provinces found.");

            var districtFilter = request.Destinations
                .Where(d => d.DistrictIds is { Count: > 0 })
                .ToDictionary(d => d.ProvinceId, d => d.DistrictIds!.ToHashSet());

            var allProvIds = destinationProvinces.Select(p => p.Id).ToHashSet();
            var locationQuery = _context.Locations
                .AsNoTracking()
                .Where(x => x.Score >= 0)
                .Where(x => x.District != null && x.District.ProvinceId.HasValue && allProvIds.Contains(x.District.ProvinceId.Value))
                // Filter: exclude ID 5 and "Travel Service" type, only Active & TemporarilyClosed (not Inactive) & not deleted
                .Where(x => x.LocationTypeId != 5 && (x.LocationType == null || !x.LocationType.Name.Contains("Travel Service")))
                .Where(x => x.Status == LocationStatus.Active || x.Status == LocationStatus.TemporarilyClosed)
                .Where(x => !x.IsDeleted);

            if (districtFilter.Count > 0)
            {
                var allDistrictIds = districtFilter.SelectMany(kv => kv.Value).ToHashSet();
                var provsWithFilter = districtFilter.Keys.ToHashSet();
                var provsWithout = allProvIds.Except(provsWithFilter).ToHashSet();

                locationQuery = locationQuery.Where(x =>
                    (x.District != null && x.District.ProvinceId.HasValue && provsWithout.Contains(x.District.ProvinceId.Value)) ||
                    allDistrictIds.Contains(x.DistrictId));
            }

            // Age filtering: null means no restriction — include all locations
            if (request.MinimumAge.HasValue)
            {
                // Specific age provided: filter locations where minimum age <= traveler's age
                locationQuery = locationQuery.Where(x => x.MinimumAge <= request.MinimumAge.Value);
            }
            // else: minimumAge is null → no age filter, include all locations

            var locations = await locationQuery
#pragma warning disable CS8602 // EF Core Include - navigation properties are populated by EF
                .Include(x => x.LocationType)
                .Include(x => x.District).ThenInclude(x => x.Province)
                .Include(x => x.OpeningHours)
                .Include(x => x.LocationTags).ThenInclude(lt => lt.Tag)
                .Include(x => x.Tags)
                .Include(x => x.LocationAmenities).ThenInclude(x => x.Amenity)
                .Include(x => x.LocationMedias)
                .Include(x => x.Closures)
#pragma warning restore CS8602
                .ToListAsync(cancellationToken);

            // Apply LocationClosure filtering based on plan dates
            locations = locations.Where(loc =>
            {
                var activeClosures = loc.Closures.Where(c => c.IsActive).ToList();
                if (activeClosures.Count == 0) return true; // No active closure -> allow

                // If any active closure overlaps with the trip date range, exclude
                var planStart = request.StartDate.ToDateTime(TimeOnly.MinValue);
                var planEnd = request.EndDate.ToDateTime(TimeOnly.MaxValue);
                return !activeClosures.Any(c => c.StartDate <= planEnd && c.EndDate >= planStart);
            }).ToList();

            if (locations.Count == 0)
                return Error.NotFound("Itinerary.Location", "No locations match current filters.");

            // Load transit hubs
            var transitHubs = await _context.TransitHubs
                .AsNoTracking()
                .Include(x => x.TransportMode)
                .Include(x => x.District).ThenInclude(x => x.Province)
                .Include(x => x.TransitHubType)
                .ToListAsync(cancellationToken);

            var favoriteTagIds = request.UserFavoriteTagIds.ToHashSet();

            // Expand parent tags to include all descendant (child/grandchild) tag IDs
            if (favoriteTagIds.Count > 0)
            {
                var allTags = await _context.Tags
                    .AsNoTracking()
                    .Select(t => new { t.Id, t.ParentTagId })
                    .ToListAsync(cancellationToken);

                var childrenByParent = allTags
                    .Where(t => t.ParentTagId.HasValue)
                    .GroupBy(t => t.ParentTagId!.Value)
                    .ToDictionary(g => g.Key, g => g.Select(t => t.Id).ToList());

                var queue = new Queue<int>(favoriteTagIds);
                while (queue.Count > 0)
                {
                    var parentId = queue.Dequeue();
                    if (childrenByParent.TryGetValue(parentId, out var children))
                    {
                        foreach (var childId in children)
                        {
                            if (favoriteTagIds.Add(childId))
                                queue.Enqueue(childId);
                        }
                    }
                }
            }

            // Separate accommodations and restaurants BEFORE tag filtering so they aren't excluded by tag preferences
            var accommodations = hasHotelPreference
                ? locations.Where(IsAccommodationType).ToList()
                : new List<Location>();

            var restaurantLocations = locations.Where(x =>
                x.LocationTypeId == 2 ||
                (x.LocationType != null && (
                    x.LocationType.Name.Contains("Restaurant", StringComparison.OrdinalIgnoreCase) ||
                    x.LocationType.Name.Contains("Food", StringComparison.OrdinalIgnoreCase) ||
                    x.LocationType.Name.Contains("Cafe", StringComparison.OrdinalIgnoreCase)))).ToList();

            var nonAccommodationLocations = locations.Where(x => !IsAccommodationType(x) && !restaurantLocations.Any(r => r.Id == x.Id)).ToList();

            // STAGE 2: Tag Scoring and Filtering (applies only to attractions)
            if (favoriteTagIds.Count > 0)
            {
                var tagFiltered = nonAccommodationLocations.Where(x =>
                    x.Tags.Any(t => favoriteTagIds.Contains(t.Id))).ToList();
                notes.Add($"Tag ID filter matched {tagFiltered.Count}/{nonAccommodationLocations.Count} locations.");
                if (tagFiltered.Count > 0) nonAccommodationLocations = tagFiltered;
                else notes.Add("Tag filter returned no results; falling back to all locations.");
            }

            // Filter attractions 
            var attractions = nonAccommodationLocations.Where(x =>
                x.LocationTypeId == 1 ||
                (x.LocationType != null && x.LocationType.Name.Contains("Attraction", StringComparison.OrdinalIgnoreCase))).ToList();

            // Filter shopping 
            var shoppingLocations = nonAccommodationLocations.Where(x =>
                (x.LocationType != null && x.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase))).ToList();

            // (Restaurants are already safely extracted above to prevent tag-filter obliteration)

            if (attractions.Count == 0)
                return Error.NotFound("Itinerary.Attraction", "No attraction locations available after filtering.");

            var attractionsByProvince = destinationProvinces.ToDictionary(
                p => p.Id, p => attractions.Where(a => a.District != null && a.District.ProvinceId.HasValue && a.District.ProvinceId.Value == p.Id).ToList());

            // Shopping locations by province (fallback when attractions exhausted)
            var shoppingByProvince = destinationProvinces.ToDictionary(
                p => p.Id, p => shoppingLocations.Where(s => s.District != null && s.District.ProvinceId.HasValue && s.District.ProvinceId.Value == p.Id).ToList());

            destinationProvinces = destinationProvinces
                .Where(p => attractionsByProvince.GetValueOrDefault(p.Id)?.Count > 0).ToList();

            if (destinationProvinces.Count == 0)
                return Error.NotFound("Itinerary.Attraction", "No attractions in any destination province.");

            const int maxAttempts = 3;
            var initialNotes = notes.ToList();

            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                notes = initialNotes.ToList();
                var randomTieBreaker = attempt > 1 ? Guid.NewGuid() : Guid.Empty;

            var scoredAttractions = attractions
                .Select(x => new ScoredLocation(x, ComputeCompositeScore(x, favoriteTagIds)))
                .OrderByDescending(x => x.CompositeScore)
                .ThenByDescending(x => attempt == 1 ? (x.Location.Score ?? 0) : 0)
                .ThenBy(x => attempt == 1 ? x.Location.Id.ToString() : (randomTieBreaker.ToString() + x.Location.Id).GetHashCode().ToString())
                .ToList();

            // Score shopping locations (mixed with attractions, compete naturally by score)
            var scoredShopping = shoppingLocations
                .Select(x => new ScoredLocation(x, ComputeCompositeScore(x, favoriteTagIds)))
                .OrderByDescending(x => x.CompositeScore)
                .ThenByDescending(x => attempt == 1 ? (x.Location.Score ?? 0) : 0)
                .ThenBy(x => attempt == 1 ? x.Location.Id.ToString() : (randomTieBreaker.ToString() + x.Location.Id).GetHashCode().ToString())
                .ToList();

            // Score restaurant locations separately for meal picker
            var scoredRestaurants = restaurantLocations
                .Select(x => new ScoredLocation(x, ComputeCompositeScore(x, favoriteTagIds)))
                .OrderByDescending(x => x.CompositeScore)
                .ThenByDescending(x => attempt == 1 ? (x.Location.Score ?? 0) : 0)
                .ThenBy(x => attempt == 1 ? x.Location.Id.ToString() : (randomTieBreaker.ToString() + x.Location.Id).GetHashCode().ToString())
                .ToList();

            // Combined scored list for activity picking (attractions + shopping mixed together)
            var scoredForActivities = scoredAttractions.Concat(scoredShopping).ToList();

            // Combined scored list for meal picking (attractions + restaurants)
            var scoredForMeals = scoredAttractions.Concat(scoredRestaurants).ToList();

            var scoredByProvince = destinationProvinces.ToDictionary(
                p => p.Id, p => scoredForActivities.Where(s => s.Location.District != null && s.Location.District.ProvinceId.HasValue && s.Location.District.ProvinceId.Value == p.Id).ToList());

            var scoredForMealsByProvince = destinationProvinces.ToDictionary(
                p => p.Id, p => scoredForMeals.Where(s => s.Location.District != null && s.Location.District.ProvinceId.HasValue && s.Location.District.ProvinceId.Value == p.Id).ToList());

            // STAGE 3: Destination Routing
            var userGeo = new GeoPoint("Your location", request.UserLocation.Latitude, request.UserLocation.Longitude);
            var orderedDestinations = OrderDestinationsByAttractionDensity(
                destinationProvinces, attractionsByProvince, userGeo);
            var dayAllocation = AllocateDaysToDestinations(
                orderedDestinations, attractionsByProvince, totalDays);

            notes.Add($"Destination order: {string.Join(" -> ", orderedDestinations.Select(d => $"{d.Name} ({dayAllocation[d.Id]}d)"))}.");

            // STAGE 4: Budget Decomposition
            var contingencyPercent = request.IsContingencyNeeded 
                ? CalculateContingencyPercentage(request.TotalBudget) 
                : 0m;
            var contingencyFund = Math.Round(request.TotalBudget * contingencyPercent, 0);
            var usableBudget = request.TotalBudget - contingencyFund;

            var maxAccommodationBudget = usableBudget * 0.40m;
            var maxIntercityTransportBudget = usableBudget * 0.30m;

            var maxPerPersonPerNight = maxAccommodationBudget / Math.Max(1, groupSize) / Math.Max(1, totalDays);
            var maxTransportPerLeg = maxIntercityTransportBudget / Math.Max(1, orderedDestinations.Count);

            var transportModes = await _context.TransportModes
                .AsNoTracking()
                .Include(x => x.LocalTransportMetrics)
                .ToListAsync(cancellationToken);

            // STAGE 5: First-Mile and Inter-City Transport
            var firstDest = orderedDestinations.First();
            var firstDestGeo = new GeoPoint(firstDest.EnglishName!, firstDest.Latitude ?? 0, firstDest.Longitude ?? 0);

            var firstMileDistance = HaversineKm(
                request.UserLocation.Latitude, request.UserLocation.Longitude,
                firstDest.Latitude ?? 0, firstDest.Longitude ?? 0);

            // Resolve user province from nearest transit hub
            int userProvinceId = ResolveProvinceFromCoords(
                request.UserLocation.Latitude, request.UserLocation.Longitude, transitHubs,
                destinationProvinces.First().Id);

            var userProvince = await _context.Provinces
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == userProvinceId, cancellationToken);
            var userProvinceName = userProvince?.EnglishName ?? "Your location";

            IntercityTransportDto intercityTransport;

            if (firstMileDistance < FirstMileIntercityThresholdKm)
            {
                var localDto = await BuildLocalTransportAsync(
                    userGeo, firstDestGeo, groupSize, transportModes, toMoney, cancellationToken);
                intercityTransport = new IntercityTransportDto(
                    userProvinceId, userProvinceName, firstDest.Id, firstDest.EnglishName!,
                    Math.Round(localDto.DistanceKm, 2),
                    null, 0, toMoney(0),
                    localDto.TransportOptions);
                notes.Add($"First-mile: {firstMileDistance:F1}km < {FirstMileIntercityThresholdKm}km -> local transport.");
            }
            else
            {
                var outboundReq = new FixedIntercitySearchRequest(
                    null, request.UserLocation.Latitude, request.UserLocation.Longitude,
                    null, firstDest.Latitude ?? 0, firstDest.Longitude ?? 0,
                    request.StartDate, null, 1, 5);

                intercityTransport = await BuildIntercityTransportAsync(
                    userGeo, firstDestGeo, groupSize, transportModes, outboundReq,
                    transitHubs, userProvinceId, userProvinceName, firstDest.Id, firstDest.EnglishName!, request.StartDate, toMoney, isLuxuryTrip, maxTransportPerLeg, cancellationToken);
                notes.Add($"First-mile: {firstMileDistance:F1}km >= {FirstMileIntercityThresholdKm}km -> intercity transport.");
            }

            decimal totalTransportBudget = GetRecommendedOption(intercityTransport).EstimatedTotalCost.BaseAmount;

            var interDestTransports = new List<IntercityTransportDto>();
            int cumulativeDays = 0;
            for (int i = 0; i < orderedDestinations.Count - 1; i++)
            {
                cumulativeDays += dayAllocation[orderedDestinations[i].Id];
                var fromDest = orderedDestinations[i];
                var toDest = orderedDestinations[i + 1];

                var segDistance = HaversineKm(fromDest.Latitude ?? 0, fromDest.Longitude ?? 0, toDest.Latitude ?? 0, toDest.Longitude ?? 0);
                bool useIntercity = segDistance >= FirstMileIntercityThresholdKm;
                var segDate = request.StartDate.AddDays(cumulativeDays);

                if (useIntercity)
                {
                    var segReq = new FixedIntercitySearchRequest(
                        null, fromDest.Latitude ?? 0, fromDest.Longitude ?? 0,
                        null, toDest.Latitude ?? 0, toDest.Longitude ?? 0, segDate, null, 1, 5);
                    var seg = await BuildIntercityTransportAsync(
                        new GeoPoint(fromDest.EnglishName!, fromDest.Latitude ?? 0, fromDest.Longitude ?? 0),
                        new GeoPoint(toDest.EnglishName!, toDest.Latitude ?? 0, toDest.Longitude ?? 0),
                        groupSize, transportModes, segReq, transitHubs, fromDest.Id, fromDest.EnglishName!, toDest.Id, toDest.EnglishName!, segDate, toMoney, isLuxuryTrip, maxTransportPerLeg, cancellationToken);
                    interDestTransports.Add(seg);
                    totalTransportBudget += GetRecommendedOption(seg).EstimatedTotalCost.BaseAmount;
                }
                else
                {
                    var localDto = await BuildLocalTransportAsync(
                        new GeoPoint(fromDest.EnglishName!, fromDest.Latitude ?? 0, fromDest.Longitude ?? 0),
                        new GeoPoint(toDest.EnglishName!, toDest.Latitude ?? 0, toDest.Longitude ?? 0),
                        groupSize, transportModes, toMoney, cancellationToken);
                    interDestTransports.Add(new IntercityTransportDto(
                        fromDest.Id, fromDest.EnglishName!, toDest.Id, toDest.EnglishName!,
                        Math.Round(localDto.DistanceKm, 2),
                        null, 0, toMoney(0),
                        localDto.TransportOptions));
                    totalTransportBudget += localDto.SelectedTotalCost;
                }
            }

            var lastDest = orderedDestinations.Last();
            var lastDestDistance = HaversineKm(lastDest.Latitude ?? 0, lastDest.Longitude ?? 0,
                request.UserLocation.Latitude, request.UserLocation.Longitude);
            bool returnUseIntercity = lastDestDistance >= FirstMileIntercityThresholdKm;

            IntercityTransportDto returnTransport;
            if (returnUseIntercity)
            {
                var returnReq = new FixedIntercitySearchRequest(
                    null, lastDest.Latitude ?? 0, lastDest.Longitude ?? 0,
                    null, request.UserLocation.Latitude, request.UserLocation.Longitude,
                    request.EndDate, null, 1, 5);
                returnTransport = await BuildIntercityTransportAsync(
                    new GeoPoint(lastDest.EnglishName!, lastDest.Latitude ?? 0, lastDest.Longitude ?? 0), userGeo,
                    groupSize, transportModes, returnReq, transitHubs, lastDest.Id, lastDest.EnglishName!, userProvinceId, userProvinceName, request.EndDate, toMoney, isLuxuryTrip, maxTransportPerLeg, cancellationToken);
            }
            else
            {
                var localDto = await BuildLocalTransportAsync(
                    new GeoPoint(lastDest.EnglishName!, lastDest.Latitude ?? 0, lastDest.Longitude ?? 0), userGeo,
                    groupSize, transportModes, toMoney, cancellationToken);
                returnTransport = new IntercityTransportDto(
                    lastDest.Id, lastDest.EnglishName!, userProvinceId, userProvinceName,
                    Math.Round(localDto.DistanceKm, 2),
                    null, 0, toMoney(0),
                    localDto.TransportOptions);
            }
            totalTransportBudget += GetRecommendedOption(returnTransport).EstimatedTotalCost.BaseAmount;

            // Accommodation (only if HotelPreference is set)
            var hotelsByProvince = destinationProvinces.ToDictionary(
                p => p.Id, p => accommodations.Where(a => a.District != null && a.District.ProvinceId.HasValue && a.District.ProvinceId.Value == p.Id).ToList());

            decimal totalAccommodationBudget = 0m;
            var selectedAccommodations = new Dictionary<int, Location>();
            var accommodationRecommendations = new List<AccommodationRecommendationDto>();
            var accommodationAlternativesByProvince = new Dictionary<int, List<AlternativeLocationDto>>();
            // hotelSkippedDueToBudget reserved for future use

            if (hasHotelPreference)
            {
                foreach (var prov in orderedDestinations)
                {
                    var provHotels = hotelsByProvince.GetValueOrDefault(prov.Id) ?? new List<Location>();
                    var provAttractions = scoredByProvince.GetValueOrDefault(prov.Id) ?? new List<ScoredLocation>();
                    int nights = Math.Max(1, dayAllocation[prov.Id] - 1);

                    var (hotel, recommendations) = SelectAndScoreAccommodation(
                        provHotels, provAttractions, groupSize,
                        usableBudget / totalDays, request.HotelPreference!, prov,
                        toMoney, maxPerPersonPerNight, recentlyVisitedLocationIds, favoriteTagIds);

                    accommodationRecommendations.AddRange(recommendations);
                    if (hotel is not null)
                    {
                        var hotelCost = GetPerPersonPrice(hotel) * groupSize * nights;

                        // Always select the hotel if it's the best match, even if it exceeds budget
                        // The budget validation will warn the user later
                        selectedAccommodations[prov.Id] = hotel;
                        totalAccommodationBudget += hotelCost;

                        // Build alternative accommodations for this province
                        var altAccoms = recommendations
                            .Where(r => r.LocationId != hotel.Id)
                            .Take(3)
                            .Select(r =>
                            {
                                var altHotel = provHotels.First(h => h.Id == r.LocationId);
                                var altDist = HaversineKmOrMax(hotel.Latitude, hotel.Longitude,
                                    altHotel.Latitude, altHotel.Longitude);
                                var altTravelMin = (int)Math.Ceiling((altDist / DefaultSpeedKmh) * 60.0);
                                var tagNames = GetTags(altHotel);
                                var altPricePerPerson = r.PricePerPersonPerNight.BaseAmount;
                                var altCostForGroup = altPricePerPerson * groupSize;
                                return new AlternativeLocationDto(
                                    r.LocationId, r.LocationName, tagNames,
                                    toMoney(0),
                                    toMoney(altPricePerPerson),
                                    toMoney(altCostForGroup),
                                    (double)altHotel.Score!,
                                    Math.Round(altDist, 2), altTravelMin,
                                    altHotel.Address, altHotel.Telephone, GetMediaUrls(altHotel));
                            }).ToList();
                        accommodationAlternativesByProvince[prov.Id] = altAccoms;
                    }
                }
            }

            var totalMealBudget = usableBudget * MealBudgetShare;
            var activityBudget = usableBudget - totalTransportBudget - totalAccommodationBudget - totalMealBudget;

            // === ACTIVITY BUDGET FLOOR ===
            // When expensive accommodation consumes most of the budget, ensure a minimum
            // activity budget so the itinerary still contains meaningful attractions.
            // Reallocate from meal budget if needed (meals will still have alternatives).
            var minActivityBudget = usableBudget * 0.05m; // 5% floor
            if (activityBudget < minActivityBudget)
            {
                var deficit = minActivityBudget - activityBudget;
                // Try to reduce meal budget to fund activities (keep at least 10% for meals)
                var minMealBudget = usableBudget * 0.10m;
                var mealReduction = Math.Min(deficit, Math.Max(0, totalMealBudget - minMealBudget));
                totalMealBudget -= mealReduction;
                activityBudget = Math.Max(minActivityBudget, activityBudget + mealReduction);
                if (mealReduction > 0)
                    notes.Add($"Meal budget reduced by {mealReduction:N0} VND to fund activities.");
            }
            if (activityBudget < 0) activityBudget = 0m;

            // Per-person per-meal budget limits (based on weights)
            var breakfastBudgetPerPerson = (totalMealBudget * BreakfastWeight) / Math.Max(1, groupSize) / Math.Max(1, totalDays);
            var lunchBudgetPerPerson = (totalMealBudget * LunchWeight) / Math.Max(1, groupSize) / Math.Max(1, totalDays);
            var dinnerBudgetPerPerson = (totalMealBudget * DinnerWeight) / Math.Max(1, groupSize) / Math.Max(1, totalDays);

            var dayWeights = CalculateDayWeights(totalDays);
            var totalWeight = dayWeights.Values.Sum();

            // STAGE 6: Day-By-Day Scheduling
            var visitedLocationIds = new HashSet<int>();
            var visitedRestaurantIds = new HashSet<int>();
            var days = new List<ItineraryDayDto>();
            decimal totalTransportCost = 0m;
            decimal totalAccommodationCost = 0m;
            decimal totalActivityCost = 0m;
            decimal totalMealCost = 0m;
            decimal remainingMealBudget = totalMealBudget; // Track across all days
            decimal rolloverBudget = 0m;
            int globalDayIndex = 0;

            // Track last visited location across days (for no-hotel multi-day trips)
            GeoPoint? prevDayLastPoint = null;
            string? prevDayLastLocationName = null;
            int prevDayLastLocationId = 0;

            for (int destIdx = 0; destIdx < orderedDestinations.Count; destIdx++)
            {
                var currentProvince = orderedDestinations[destIdx];
                var daysInDest = dayAllocation[currentProvince.Id];
                var destAttractions = scoredByProvince.GetValueOrDefault(currentProvince.Id) ?? new List<ScoredLocation>();
                var destMealLocations = scoredForMealsByProvince.GetValueOrDefault(currentProvince.Id) ?? new List<ScoredLocation>();
                var destAccommodation = hasHotelPreference
                    ? selectedAccommodations.GetValueOrDefault(currentProvince.Id) : null;

                for (int localDay = 0; localDay < daysInDest; localDay++)
                {
                    var date = request.StartDate.AddDays(globalDayIndex);
                    var dayNumber = globalDayIndex + 1;
                    var timeline = new List<ItineraryTimelineItemDto>();
                    var dayTransportCost = 0m;
                    var dayAccommodationCost = 0m;
                    var dayActivityCost = 0m;
                    var dayMealCost = 0m;

                    var dayWeight = dayWeights.GetValueOrDefault(dayNumber, 1.0);
                    var baseDailyBudget = activityBudget * (decimal)dayWeight / (decimal)totalWeight;
                    var dailyBudget = baseDailyBudget + rolloverBudget;
                    var (_, limit) = CalculateBudgetBounds(baseDailyBudget);
                    var remainingDayBudget = limit + rolloverBudget;

                    var weatherLocation = ResolveWeatherLocationFromProvince(currentProvince, locations);
                    var weather = await _weatherAdvisoryService.GetAdviceAsync(weatherLocation, date, cancellationToken);
                    bool isBadWeather = weather is { IsOutdoorFriendly: false };
                    if (isBadWeather) notes.Add($"{date:yyyy-MM-dd}: weather suggests reducing outdoor activities.");

                    var dayAttractions = isBadWeather
                        ? ApplyWeatherScoring(destAttractions, isBadWeather: true)
                        : destAttractions;

                    // === DYNAMIC START TIME for Day 1 ===
                    // Calculate start time based on intercity departure + buffer
                    DateTime calculatedStartTime;
                    if (globalDayIndex == 0 && userProvinceId != firstDest.Id)
                    {
                        // Intercity travel: calculate from departure time
                        var recOpt = GetRecommendedOption(intercityTransport);

                        // Determine departure time: use departure time from API if available, otherwise estimate
                        // The intercity transport options may have departure info from the hub
                        // For now, calculate backwards from departure time - buffer - local transfer
                        var localTransferToHub = await BuildLocalTransportAsync(
                            userGeo, new GeoPoint("Hub", userProvince!.Latitude ?? 0, userProvince.Longitude ?? 0),
                            groupSize, transportModes, toMoney, cancellationToken);

                        int bufferBeforeDeparture = recOpt.Method switch
                        {
                            "Plane" => BufferBeforeFlightDeparture,
                            "Train" => BufferBeforeTrainDeparture,
                            "Bus" => BufferBeforeBusDeparture,
                            _ => BufferBeforeBusDeparture
                        };

                        // Calculate: departureTime - buffer - localTransferTime
                        // Since we don't have exact departure time from the recommended option yet,
                        // use the estimated travel time to derive a reasonable start
                        // Default: aim to depart around 08:00-09:00 for flights, adjusted by transport type
                        var targetDepartureHour = recOpt.Method switch
                        {
                            "Plane" => 8,   // Aim for 08:00 flight
                            "Train" => 9,   // Aim for 09:00 train
                            "Bus" => 7,     // Aim for 07:00 bus
                            _ => 8
                        };

                        var targetDeparture = date.ToDateTime(new TimeOnly(targetDepartureHour, 0));
                        var totalPrepTime = bufferBeforeDeparture + localTransferToHub.SelectedTravelTimeMinutes;
                        calculatedStartTime = AddMinutes(targetDeparture, -totalPrepTime);

                        // Ensure start time is not too early (before 05:00) or too late (after 09:00)
                        var minStart = date.ToDateTime(new TimeOnly(5, 0));
                        var maxStart = date.ToDateTime(new TimeOnly(9, 0));
                        if (calculatedStartTime < minStart) calculatedStartTime = minStart;
                        if (calculatedStartTime > maxStart) calculatedStartTime = maxStart;
                    }
                    else
                    {
                        // Same province or not Day 1: default start
                        calculatedStartTime = date.ToDateTime(new TimeOnly(7, 0));
                    }

                    var currentTime = calculatedStartTime;
                    // On the last day, tighten dayEndTime to before checkout so the greedy loop
                    // fills time with activities before lunch/checkout instead of extending to 22:00
                    DateTime dayEndTime;
                    if (globalDayIndex == totalDays - 1)
                    {
                        if (totalDays == 1)
                            dayEndTime = date.ToDateTime(new TimeOnly(20, 30)); // Single-day trip: full day
                        else if (destAccommodation is null)
                            dayEndTime = date.ToDateTime(new TimeOnly(17, 0));  // Multi-day last day, no hotel: explore until late afternoon then return
                        else
                            dayEndTime = date.ToDateTime(new TimeOnly(11, 30)); // Multi-day last day with hotel: stop before lunch/checkout
                    }
                    else
                    {
                        dayEndTime = date.ToDateTime(new TimeOnly(22, 00));
                    }
                    GeoPoint currentPoint;
                    string? currentLocationName = null;
                    int currentLocationId = 0;
                    bool breakfastInserted = false;
                    bool lunchInserted = false;
                    bool dinnerInserted = false;
                    bool checkInDeferred = false; // When true, hotel check-in is deferred to before lunch


                    // === Day 1: Outbound transfer -> Hub -> Hotel (if pref) -> Attractions ===
                    if (globalDayIndex == 0)
                    {
                        var recOpt = GetRecommendedOption(intercityTransport);

                        // Check if user is already in the same province as first destination
                        bool isSameProvince = userProvinceId == firstDest.Id;

                        if (isSameProvince)
                        {
                            // User is in the same province - go directly to hotel or first activity
                            GeoPoint targetPoint;
                            int targetId;
                            string targetName = null!;
                            
                            if (destAccommodation is not null)
                            {
                                targetPoint = GeoPoint.FromLocation(destAccommodation);
                                targetId = destAccommodation.Id;
                                targetName = destAccommodation.Name;
                            }
                            else
                            {
                                // No hotel: estimate arrival time to determine if we should go to breakfast first
                                var estTransport = await BuildLocalTransportAsync(
                                    userGeo, firstDestGeo, groupSize, transportModes, toMoney, cancellationToken);
                                var estArrivalTime = AddMinutes(currentTime, estTransport.SelectedTravelTimeMinutes);
                                var estArrivalTimeOnly = TimeOnly.FromDateTime(AddMinutes(estArrivalTime, BufferAfterLocalTransfer));

                                if (!breakfastInserted && estArrivalTimeOnly >= BreakfastStart && estArrivalTimeOnly < BreakfastEnd)
                                {
                                    // Arrival in breakfast window: pick restaurant near destination, go directly there
                                    var bfRestaurant = PickRestaurantNearby(destMealLocations, firstDestGeo, visitedLocationIds, visitedRestaurantIds, breakfastBudgetPerPerson, groupSize, request.TripSegment, out var bfAlternatives, toMoney, recentlyVisitedLocationIds, favoriteTagIds);
                                    var bfLoc = bfRestaurant?.Location;
                                    if (bfLoc is not null)
                                    {
                                        targetPoint = GeoPoint.FromLocation(bfLoc);
                                        targetId = bfLoc.Id;
                                        targetName = bfLoc.Name;
                                    }
                                    else
                                    {
                                        targetPoint = firstDestGeo;
                                        targetId = 0;
                                        targetName = currentProvince.EnglishName!;
                                    }

                                    // Build travel from user to restaurant/destination
                                    var directTransportBf = await BuildLocalTransportAsync(
                                        userGeo, targetPoint, groupSize, transportModes, toMoney, cancellationToken);
                                    var directArrivalBf = AddMinutes(currentTime, directTransportBf.SelectedTravelTimeMinutes);

                                    var directLegBf = new LocationToLocationTravelLegDto(
                                        0, "Your Location", targetId, targetName,
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directArrivalBf),
                                        directTransportBf.DistanceKm, null,
                                        0, toMoney(0),
                                        directTransportBf.TransportOptions);
                                    timeline.Add(new ItineraryTimelineItemDto("travel",
                                        "Local transfer",
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directArrivalBf),
                                        0, new List<string>(),
                                        null, null, null, "", 0,
                                        LocationToLocationTravel: directLegBf));
                                    dayTransportCost += directTransportBf.SelectedTotalCost;
                                    currentTime = AddMinutes(directArrivalBf, BufferAfterLocalTransfer);
                                    currentPoint = targetPoint;
                                    currentLocationName = targetName;
                                    currentLocationId = targetId;

                                    // Inject breakfast immediately
                                    if (bfLoc is not null)
                                    {
                                        var bfExtraCost = GetPerPersonPrice(bfLoc);
                                        var bfGroupCost = bfExtraCost * groupSize;
                                        var bfBudgetDeduction = bfGroupCost;
                                        if (bfGroupCost > remainingMealBudget || (remainingDayBudget > 0 && bfGroupCost > remainingDayBudget))
                                            bfBudgetDeduction = 0m;

                                        var bfTagNames = GetTags(bfLoc);
                                        var bfActualEnd = AddMinutes(currentTime, 45);
                                        timeline.Add(new ItineraryTimelineItemDto("meal",
                                            $"Breakfast at {bfLoc.Name}",
                                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(bfActualEnd),
                                            bfLoc.Id, bfTagNames,
                                            toMoney(0), toMoney(bfExtraCost), toMoney(bfGroupCost), "Breakfast",
                                            Math.Round((double)(bfLoc.Score ?? 0), 2),
                                            Alternatives: bfAlternatives.Count > 0 ? bfAlternatives : null));
                                        totalMealCost += bfBudgetDeduction > 0 ? bfGroupCost : 0m;
                                        dayMealCost += bfBudgetDeduction > 0 ? bfGroupCost : 0m;
                                        remainingDayBudget -= bfBudgetDeduction;
                                        remainingMealBudget -= bfBudgetDeduction;
                                        currentTime = AddMinutes(bfActualEnd, BufferAfterMeal);
                                        breakfastInserted = true;
                                        visitedRestaurantIds.Add(bfLoc.Id);
                                    }

                                    goto sameProvinceTransferDone;
                                }
                                else
                                {
                                    // Not breakfast time: go directly to first attraction, visit it, then continue
                                    var firstAttr = destAttractions.FirstOrDefault()?.Location;
                                    if (firstAttr is not null)
                                    {
                                        targetPoint = GeoPoint.FromLocation(firstAttr);
                                        targetId = firstAttr.Id;
                                        targetName = firstAttr.Name;
                                    }
                                    else
                                    {
                                        targetPoint = firstDestGeo;
                                        targetId = 0;
                                        targetName = currentProvince.EnglishName!;
                                    }

                                    var directTransportAttr = await BuildLocalTransportAsync(
                                        userGeo, targetPoint, groupSize, transportModes, toMoney, cancellationToken);
                                    var directArrivalAttr = AddMinutes(currentTime, directTransportAttr.SelectedTravelTimeMinutes);

                                    var directLegAttr = new LocationToLocationTravelLegDto(
                                        0, "Your Location", targetId, targetName,
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directArrivalAttr),
                                        directTransportAttr.DistanceKm, null,
                                        0, toMoney(0),
                                        directTransportAttr.TransportOptions);
                                    timeline.Add(new ItineraryTimelineItemDto("travel",
                                        "Local transfer",
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directArrivalAttr),
                                        0, new List<string>(),
                                        null, null, null, "", 0,
                                        LocationToLocationTravel: directLegAttr));
                                    dayTransportCost += directTransportAttr.SelectedTotalCost;
                                    currentTime = AddMinutes(directArrivalAttr, BufferAfterLocalTransfer);
                                    currentPoint = targetPoint;
                                    currentLocationName = targetName;
                                    currentLocationId = targetId;

                                    // Force visit/shopping at arrival location
                                    if (firstAttr is not null)
                                    {
                                        var stayMin = firstAttr.RecommendedDurationMinutes ?? DefaultStayMinutes;
                                        var visitEnd = AddMinutes(currentTime, stayMin);
                                        var ticket = firstAttr.TicketPrice;
                                        var extra = EstimateExtraSpending(firstAttr, request.TripSegment, groupSize);
                                        var evtType = (firstAttr.LocationTypeId == 5 ||
                                            (firstAttr.LocationType != null && firstAttr.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                                            ? "shopping" : "visit";
                                        var scored = dayAttractions.FirstOrDefault(x => x.Location.Id == firstAttr.Id);
                                        timeline.Add(new ItineraryTimelineItemDto(evtType,
                                            evtType == "shopping" ? $"Shopping at {firstAttr.Name}" : $"Visit {firstAttr.Name}",
                                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(visitEnd),
                                            firstAttr.Id, GetTags(firstAttr),
                                            toMoney(ticket), toMoney(extra / groupSize),
                                            toMoney((ticket * groupSize) + extra),
                                            $"Score: {scored?.CompositeScore:F1}",
                                            Math.Round((double)(firstAttr.Score ?? 0), 2),
                                            firstAttr.Address, firstAttr.Telephone, GetMediaUrls(firstAttr)));
                                        dayActivityCost += (ticket * groupSize) + extra;
                                        remainingDayBudget -= (ticket * groupSize) + extra;
                                        visitedLocationIds.Add(firstAttr.Id);
                                        currentTime = AddMinutes(visitEnd, BufferAfterActivity);
                                    }

                                    goto sameProvinceTransferDone;
                                }
                            }

                            var directTransport = await BuildLocalTransportAsync(
                                userGeo, targetPoint, groupSize, transportModes, toMoney, cancellationToken);
                            var directArrival = AddMinutes(currentTime, directTransport.SelectedTravelTimeMinutes);

                            var directLeg = new LocationToLocationTravelLegDto(
                                0, "Your Location", targetId, targetName,
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directArrival),
                                directTransport.DistanceKm, null,
                                0, toMoney(0),
                                directTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Local transfer",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                LocationToLocationTravel: directLeg));
                            dayTransportCost += directTransport.SelectedTotalCost;
                            currentTime = AddMinutes(directArrival, BufferAfterLocalTransfer);
                            currentPoint = targetPoint;
                            currentLocationName = targetName;
                            currentLocationId = targetId;

                            sameProvinceTransferDone:;
                        }
                        else if (HasNoTransitHubSupport(intercityTransport))
                        {
                            // User is in a different province but NO transit hubs exist in DB
                            // and API returned no hub-based data → fall back to a single direct local transfer
                            GeoPoint targetPoint;
                            int targetId;
                            string targetName = null!;
                            Location? arrivalAttraction = null;
                            if (destAccommodation is not null)
                            {
                                // Go directly to hotel
                                targetPoint = GeoPoint.FromLocation(destAccommodation);
                                targetId = destAccommodation.Id;
                                targetName = destAccommodation.Name;
                            }
                            else
                            {
                                // No hotel: go directly to first attraction and visit it
                                var firstAttr = destAttractions.FirstOrDefault()?.Location;
                                if (firstAttr is not null)
                                {
                                    targetPoint = GeoPoint.FromLocation(firstAttr);
                                    targetId = firstAttr.Id;
                                    targetName = firstAttr.Name;
                                    arrivalAttraction = firstAttr;
                                }
                                else
                                {
                                    targetPoint = firstDestGeo;
                                    targetId = 0;
                                    targetName = currentProvince.EnglishName!;
                                }
                            }

                            var directTransport = await BuildLocalTransportAsync(
                                userGeo, targetPoint, groupSize, transportModes, toMoney, cancellationToken);
                            var directArrival = AddMinutes(currentTime, directTransport.SelectedTravelTimeMinutes);

                            var directLeg = new LocationToLocationTravelLegDto(
                                0, "Your Location", targetId, targetName,
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directArrival),
                                directTransport.DistanceKm, null,
                                0, toMoney(0),
                                directTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Local transfer",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                LocationToLocationTravel: directLeg));
                            dayTransportCost += directTransport.SelectedTotalCost;
                            currentTime = AddMinutes(directArrival, BufferAfterLocalTransfer);
                            currentPoint = targetPoint;
                            currentLocationName = targetName;
                            currentLocationId = targetId;

                            // Force visit/shopping at arrival attraction (when no hotel)
                            if (arrivalAttraction is not null)
                            {
                                var stayMin = arrivalAttraction.RecommendedDurationMinutes ?? DefaultStayMinutes;
                                var visitEnd = AddMinutes(currentTime, stayMin);
                                var ticket = arrivalAttraction.TicketPrice;
                                var extra = EstimateExtraSpending(arrivalAttraction, request.TripSegment, groupSize);
                                var evtType = (arrivalAttraction.LocationTypeId == 5 ||
                                    (arrivalAttraction.LocationType != null && arrivalAttraction.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                                    ? "shopping" : "visit";
                                var scored = dayAttractions.FirstOrDefault(x => x.Location.Id == arrivalAttraction.Id);
                                timeline.Add(new ItineraryTimelineItemDto(evtType,
                                    evtType == "shopping" ? $"Shopping at {arrivalAttraction.Name}" : $"Visit {arrivalAttraction.Name}",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(visitEnd),
                                    arrivalAttraction.Id, GetTags(arrivalAttraction),
                                    toMoney(ticket), toMoney(extra / groupSize),
                                    toMoney((ticket * groupSize) + extra),
                                    $"Score: {scored?.CompositeScore:F1}",
                                    Math.Round((double)(arrivalAttraction.Score ?? 0), 2),
                                    arrivalAttraction.Address, arrivalAttraction.Telephone, GetMediaUrls(arrivalAttraction)));
                                dayActivityCost += (ticket * groupSize) + extra;
                                remainingDayBudget -= (ticket * groupSize) + extra;
                                visitedLocationIds.Add(arrivalAttraction.Id);
                                currentTime = AddMinutes(visitEnd, BufferAfterActivity);
                            }

                            // Skip breakfast for intercity no-hub transfers — user just traveled a long distance,
                            // suggesting a breakfast stop en route or immediately after is unreasonable
                            breakfastInserted = true;
                        }
                        else
                        {
                            // User is in a different province - use intercity transfer with transit hubs
                            // 1. Travel from user location to departure transit hub
                            var startHubPoint = new GeoPoint("Hub", userProvince!.Latitude ?? 0, userProvince.Longitude ?? 0);
                            var toStartHubTransport = await BuildLocalTransportAsync(
                                userGeo, startHubPoint, groupSize, transportModes, toMoney, cancellationToken);
                            var toStartHubArrival = AddMinutes(currentTime, toStartHubTransport.SelectedTravelTimeMinutes);

                            var toStartHubLeg = new LocationToTransitHubTravelLegDto(
                                0, "Your Location", recOpt.FromTransitHubId, recOpt.FromTransitHubName ?? "Departure Station",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(toStartHubArrival),
                                toStartHubTransport.DistanceKm, null,
                                0, toMoney(0),
                                toStartHubTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Local transfer",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(toStartHubArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                LocationToTransitHubTravel: toStartHubLeg));
                            dayTransportCost += toStartHubTransport.SelectedTotalCost;
                            currentTime = AddMinutes(toStartHubArrival, BufferAfterLocalTransfer);

                            // 2. Intercity transfer to destination
                            var arrivalTime = AddMinutes(currentTime, recOpt.EstimatedTravelMinutes);

                            var outboundLeg = new ProvinceToProvinceTravelLegDto(
                                intercityTransport.FromProvinceId, intercityTransport.FromProvinceName,
                                intercityTransport.ToProvinceId, intercityTransport.ToProvinceName,
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(arrivalTime),
                                intercityTransport.DistanceKm, null,
                                0, toMoney(0),
                                intercityTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Intercity transfer",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(arrivalTime),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                ProvinceToProvinceTravel: outboundLeg));
                            dayTransportCost += recOpt.EstimatedTotalCost.BaseAmount;
                            currentTime = AddMinutes(arrivalTime, BufferAfterIntercityArrival);
                            currentPoint = firstDestGeo;
                            currentLocationName = recOpt.ToTransitHubName;

                            // Transport from hub to hotel or first attraction
                            {
                                GeoPoint hubToTarget;
                                int hubToTargetId;
                                string hubToTargetName = null!;
                                if (destAccommodation is not null)
                                {
                                    hubToTarget = GeoPoint.FromLocation(destAccommodation);
                                    hubToTargetId = destAccommodation.Id;
                                    hubToTargetName = destAccommodation.Name;
                                }
                                else
                                {
                                    var firstAttr = destAttractions.FirstOrDefault()?.Location;
                                    if (firstAttr is not null)
                                    {
                                        hubToTarget = GeoPoint.FromLocation(firstAttr);
                                        hubToTargetId = firstAttr.Id;
                                        hubToTargetName = firstAttr.Name;
                                    }
                                    else
                                    {
                                        hubToTarget = firstDestGeo;
                                        hubToTargetId = 0;
                                        hubToTargetName = currentProvince.EnglishName!;
                                    }
                                }

                                var hubTransport = await BuildLocalTransportAsync(
                                    currentPoint, hubToTarget, groupSize, transportModes, toMoney, cancellationToken);
                                var hubArrival = AddMinutes(currentTime, hubTransport.SelectedTravelTimeMinutes);
                                var hubLeg = new TransitHubToLocationTravelLegDto(
                                    recOpt.ToTransitHubId, recOpt.ToTransitHubName ?? "", hubToTargetId, hubToTargetName,
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(hubArrival),
                                    hubTransport.DistanceKm, null,
                                    0, toMoney(0),
                                    hubTransport.TransportOptions);
                                timeline.Add(new ItineraryTimelineItemDto("travel",
                                    "Local transfer",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(hubArrival),
                                    0, new List<string>(),
                                    null, null, null, "", 0,
                                    TransitHubToLocationTravel: hubLeg));
                                dayTransportCost += hubTransport.SelectedTotalCost;
                                currentTime = AddMinutes(hubArrival, BufferAfterLocalTransfer);
                                currentPoint = hubToTarget;
                                currentLocationName = hubToTargetName;
                                currentLocationId = hubToTargetId;
                            }
                        }

                        // === RULE 2: Day 1 — Hotel check-in ===
                        // Early arrival (before 13:00): drop luggage at hotel first, then explore.
                        // Actual check-in is deferred to ~14:00 (standard hotel check-in) via the greedy loop.
                        if (destAccommodation is not null)
                        {
                            var standardCheckInTime = date.ToDateTime(new TimeOnly(14, 0));

                            if (currentTime < standardCheckInTime)
                            {
                                // Early arrival: luggage storage at hotel, then go explore
                                var luggageStart = currentTime;
                                var luggageEnd = AddMinutes(luggageStart, 15);
                                var accomAltsEarly = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                                var luggageTagNames = GetTags(destAccommodation);

                                var accomRecsEarly = accommodationRecommendations
                                    .Where(r => {
                                        var hotel = accommodations.FirstOrDefault(a => a.Id == r.LocationId);
                                        return hotel is not null && hotel.District != null && hotel.District.ProvinceId.HasValue && hotel.District.ProvinceId.Value == currentProvince.Id;
                                    }).ToList();

                                timeline.Add(new ItineraryTimelineItemDto("luggage-drop",
                                    $"Drop luggage at {destAccommodation.Name}",
                                    TimeOnly.FromDateTime(luggageStart), TimeOnly.FromDateTime(luggageEnd),
                                    destAccommodation.Id, luggageTagNames,
                                    toMoney(0), toMoney(0), toMoney(0), "Drop off luggage before check-in time, explore the area first",
                                    Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                    destAccommodation.Address, destAccommodation.Telephone, GetMediaUrls(destAccommodation),
                                    Alternatives: accomAltsEarly is { Count: > 0 } ? accomAltsEarly : null,
                                    AccommodationRecommendations: accomRecsEarly.Count > 0 ? accomRecsEarly : null));
                                currentTime = AddMinutes(luggageEnd, BufferAfterLocalTransfer);
                                currentPoint = GeoPoint.FromLocation(destAccommodation);
                                currentLocationName = destAccommodation.Name;
                                currentLocationId = destAccommodation.Id;
                                checkInDeferred = true;
                            }
                            else
                            {
                                // Arrival at 14:00+ → check in now
                                var checkInStart = currentTime;
                                var checkInEnd = AddMinutes(checkInStart, 30);
                                var accomAlts = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                                var checkInTagNames = GetTags(destAccommodation);

                                var accomRecsForCheckIn = accommodationRecommendations
                                    .Where(r => {
                                        var hotel = accommodations.FirstOrDefault(a => a.Id == r.LocationId);
                                        return hotel is not null && hotel.District != null && hotel.District.ProvinceId.HasValue && hotel.District.ProvinceId.Value == currentProvince.Id;
                                    }).ToList();

                                timeline.Add(new ItineraryTimelineItemDto("check-in",
                                    $"Check in at {destAccommodation.Name} - Drop off luggage",
                                    TimeOnly.FromDateTime(checkInStart), TimeOnly.FromDateTime(checkInEnd),
                                    destAccommodation.Id, checkInTagNames,
                                    toMoney(0), toMoney(0), toMoney(0), "Check in and drop off luggage",
                                    Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                    destAccommodation.Address, destAccommodation.Telephone, GetMediaUrls(destAccommodation),
                                    Alternatives: accomAlts is { Count: > 0 } ? accomAlts : null,
                                    AccommodationRecommendations: accomRecsForCheckIn.Count > 0 ? accomRecsForCheckIn : null));
                                currentTime = AddMinutes(checkInEnd, BufferAfterLocalTransfer);
                                currentPoint = GeoPoint.FromLocation(destAccommodation);
                                currentLocationName = destAccommodation.Name;
                                currentLocationId = destAccommodation.Id;
                            }
                        }

                        // === MEAL INJECTION AFTER HOTEL CHECK-IN ===
                        // Only inject meals here when check-in was done immediately (not deferred).
                        // When deferred, the greedy loop handles breakfast + morning activities, then check-in before lunch.
                        if (!checkInDeferred)
                        {
                        var currentTimeOnly = TimeOnly.FromDateTime(currentTime);

                        // === LATE LUNCH / BRUNCH HANDLING ===
                        // Case 1: Normal lunch window (11:00-13:30) → full lunch
                        // Case 2: Late arrival (13:30-14:30) → shortened lunch (45 min)
                        // Case 3: Very late (14:30-16:00) → "brunch" (merged late lunch + early dinner, skip regular dinner later)
#pragma warning disable CS0219 // Variable is assigned but never used
                        bool _lateLunchInjected = false; // tracked for debugging
#pragma warning restore CS0219
                        if (!lunchInserted && currentTimeOnly >= new TimeOnly(11, 0) && currentTimeOnly < new TimeOnly(14, 30))
                        {
                            // Determine lunch duration based on arrival time
                            int lunchDurationMinutes;
                            string mealLabel;
                            bool isBrunch = false;

                            if (currentTimeOnly < LunchEnd)
                            {
                                // Normal lunch: arrival before 13:30 → full 60 min
                                lunchDurationMinutes = 60;
                                mealLabel = "Lunch after check-in";
                            }
                            else if (currentTimeOnly < new TimeOnly(14, 30))
                            {
                                // Late lunch: arrival 13:30-14:30 → shortened 45 min
                                lunchDurationMinutes = 45;
                                mealLabel = "Late lunch after check-in";
                            }
                            else
                            {
                                // Brunch: arrival 14:30+ → 75 min merged meal, skip dinner later
                                lunchDurationMinutes = 75;
                                mealLabel = "Late lunch / early dinner (brunch)";
                                isBrunch = true;
                            }

                            // Use combined lunch+dinner budget for brunch
                            var mealBudget = isBrunch
                                ? (lunchBudgetPerPerson + dinnerBudgetPerPerson)
                                : lunchBudgetPerPerson;

                            var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, visitedRestaurantIds, mealBudget, groupSize, request.TripSegment, out var mealAlternatives, toMoney, recentlyVisitedLocationIds, favoriteTagIds);
                            var rLoc = restaurant?.Location;
                            var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                            var mealGroupCost = mealExtraCost * groupSize;

                            // If restaurant exceeds budget, keep display costs but don't deduct from budget
                            var mealBudgetDeduction = mealGroupCost;
                            if (mealGroupCost > remainingMealBudget || (remainingDayBudget > 0 && mealGroupCost > remainingDayBudget))
                            {
                                mealBudgetDeduction = 0m;
                            }

                            var mealTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                            var mealEnd = AddMinutes(currentTime, lunchDurationMinutes);

                            timeline.Add(new ItineraryTimelineItemDto("meal",
                                rLoc is not null ? $"{(isBrunch ? "Late lunch / early dinner" : "Lunch")} at {rLoc.Name}" : (isBrunch ? "Late lunch / early dinner (brunch)" : "Lunch"),
                                currentTimeOnly, TimeOnly.FromDateTime(mealEnd),
                                rLoc?.Id ?? 0, mealTagNames,
                                toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), mealLabel,
                                rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                                Alternatives: mealAlternatives.Count > 0 ? mealAlternatives : null));
                            totalMealCost += mealBudgetDeduction > 0 ? mealGroupCost : 0m;
                            dayMealCost += mealBudgetDeduction > 0 ? mealGroupCost : 0m;
                            remainingDayBudget -= mealBudgetDeduction;
                            remainingMealBudget -= mealBudgetDeduction;
                            currentTime = AddMinutes(mealEnd, BufferAfterMeal);
                            lunchInserted = true;
                            _lateLunchInjected = true;

                            // If brunch, also mark dinner as injected (skip regular dinner)
                            if (isBrunch)
                            {
                                dinnerInserted = true;
                            }

                            if (rLoc is not null)
                            {
                                currentPoint = GeoPoint.FromLocation(rLoc);
                                currentLocationName = rLoc.Name;
                                currentLocationId = rLoc.Id;
                            }
                        }
                        // Check for breakfast overlap (arrival before 08:30)
                        else if (!breakfastInserted && currentTimeOnly >= BreakfastStart && currentTimeOnly < BreakfastEnd)
                        {
                            var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, visitedRestaurantIds, breakfastBudgetPerPerson, groupSize, request.TripSegment, out var breakfastAlternatives, toMoney, recentlyVisitedLocationIds, favoriteTagIds);
                            var rLoc = restaurant?.Location;
                            var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                            var mealGroupCost = mealExtraCost * groupSize;

                            // If restaurant exceeds budget, keep display costs but don't deduct from budget
                            var mealBudgetDeduction = mealGroupCost;
                            if (mealGroupCost > remainingMealBudget || (remainingDayBudget > 0 && mealGroupCost > remainingDayBudget))
                            {
                                mealBudgetDeduction = 0m;
                            }

                            var breakfastTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                            timeline.Add(new ItineraryTimelineItemDto("meal",
                                rLoc is not null ? $"Breakfast at {rLoc.Name}" : "Breakfast",
                                currentTimeOnly, BreakfastEnd,
                                rLoc?.Id ?? 0, breakfastTagNames,
                                toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), "Breakfast after check-in",
                                rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                                Alternatives: breakfastAlternatives.Count > 0 ? breakfastAlternatives : null));
                            totalMealCost += mealBudgetDeduction > 0 ? mealGroupCost : 0m;
                            dayMealCost += mealBudgetDeduction > 0 ? mealGroupCost : 0m;
                            remainingDayBudget -= mealBudgetDeduction;
                            remainingMealBudget -= mealBudgetDeduction;
                            currentTime = date.ToDateTime(BreakfastEnd).AddMinutes(BufferAfterMeal);
                            breakfastInserted = true;
                            if (rLoc is not null)
                            {
                                currentPoint = GeoPoint.FromLocation(rLoc);
                                currentLocationName = rLoc.Name;
                                currentLocationId = rLoc.Id;
                            }
                        }
                        } // end if (!checkInDeferred)
                    }
                    // === First day at new destination (inter-destination transfer) ===
                    else if (localDay == 0 && destIdx > 0)
                    {
                        var prevProvince = orderedDestinations[destIdx - 1];
                        var prevAccom = hasHotelPreference
                            ? selectedAccommodations.GetValueOrDefault(prevProvince.Id) : null;

                        if (prevAccom is not null)
                        {
                            var checkoutEnd = AddMinutes(currentTime, 30);
                            var prevAccomAlts = accommodationAlternativesByProvince.GetValueOrDefault(prevProvince.Id);
                            var checkoutTagNames = GetTags(prevAccom);
                            var coPerPerson = GetPerPersonPrice(prevAccom);
                            var coGroupCost = coPerPerson * groupSize;
                            timeline.Add(new ItineraryTimelineItemDto("check-out",
                                $"Check out from {prevAccom.Name} - Pick up luggage",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(checkoutEnd),
                                prevAccom.Id, checkoutTagNames,
                                toMoney(0), toMoney(coPerPerson), toMoney(coGroupCost), "Check out and pick up luggage",
                                Math.Round((double)(prevAccom.Score ?? 0), 2),
                                Alternatives: prevAccomAlts is { Count: > 0 } ? prevAccomAlts : null));
                            dayAccommodationCost += coGroupCost;
                            currentTime = AddMinutes(checkoutEnd, 10);
                        }

                        var segTransport = interDestTransports[destIdx - 1];
                        var segRecOpt = GetRecommendedOption(segTransport);

                        if (HasNoTransitHubSupport(segTransport))
                        {
                            // No transit hubs available for this inter-destination segment
                            // → fall back to a single direct local transfer
                            GeoPoint segDirectTarget;
                            int segDirectTargetId;
                            string segDirectTargetName;
                            if (destAccommodation is not null)
                            {
                                segDirectTarget = GeoPoint.FromLocation(destAccommodation);
                                segDirectTargetId = destAccommodation.Id;
                                segDirectTargetName = destAccommodation.Name;
                            }
                            else
                            {
                                // No hotel: go directly to first attraction and visit it
                                var firstAttr = destAttractions.FirstOrDefault()?.Location;
                                if (firstAttr is not null)
                                {
                                    segDirectTarget = GeoPoint.FromLocation(firstAttr);
                                    segDirectTargetId = firstAttr.Id;
                                    segDirectTargetName = firstAttr.Name;
                                }
                                else
                                {
                                    segDirectTarget = new GeoPoint(currentProvince.EnglishName!, currentProvince.Latitude ?? 0, currentProvince.Longitude ?? 0);
                                    segDirectTargetId = 0;
                                    segDirectTargetName = currentProvince.EnglishName!;
                                }
                            }

                            var segDirectFrom = prevAccom is not null
                                ? GeoPoint.FromLocation(prevAccom)
                                : new GeoPoint(prevProvince.EnglishName!, prevProvince.Latitude ?? 0, prevProvince.Longitude ?? 0);
                            var segDirectTransport = await BuildLocalTransportAsync(
                                segDirectFrom, segDirectTarget, groupSize, transportModes, toMoney, cancellationToken);
                            var segDirectArrival = AddMinutes(currentTime, segDirectTransport.SelectedTravelTimeMinutes);

                            var segDirectLeg = new LocationToLocationTravelLegDto(
                                prevAccom?.Id ?? 0, prevAccom?.Name ?? "Unknown", segDirectTargetId, segDirectTargetName,
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(segDirectArrival),
                                segDirectTransport.DistanceKm, null,
                                0, toMoney(0),
                                segDirectTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Local transfer",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(segDirectArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                LocationToLocationTravel: segDirectLeg));
                            dayTransportCost += segDirectTransport.SelectedTotalCost;
                            currentTime = AddMinutes(segDirectArrival, BufferAfterLocalTransfer);
                            currentPoint = segDirectTarget;
                            currentLocationName = segDirectTargetName;

                            // Force visit/shopping at arrival attraction (when no hotel)
                            if (destAccommodation is null && segDirectTargetId > 0)
                            {
                                var arrLoc = destAttractions.FirstOrDefault(x => x.Location.Id == segDirectTargetId);
                                if (arrLoc is not null)
                                {
                                    var loc = arrLoc.Location;
                                    var stayMin = loc.RecommendedDurationMinutes ?? DefaultStayMinutes;
                                    var visitEnd = AddMinutes(currentTime, stayMin);
                                    var ticket = loc.TicketPrice;
                                    var extra = EstimateExtraSpending(loc, request.TripSegment, groupSize);
                                    var evtType = (loc.LocationTypeId == 5 ||
                                        (loc.LocationType != null && loc.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                                        ? "shopping" : "visit";
                                    timeline.Add(new ItineraryTimelineItemDto(evtType,
                                        evtType == "shopping" ? $"Shopping at {loc.Name}" : $"Visit {loc.Name}",
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(visitEnd),
                                        loc.Id, GetTags(loc),
                                        toMoney(ticket), toMoney(extra / groupSize),
                                        toMoney((ticket * groupSize) + extra),
                                        $"Score: {arrLoc.CompositeScore:F1}",
                                        Math.Round((double)(loc.Score ?? 0), 2),
                                        loc.Address, loc.Telephone, GetMediaUrls(loc)));
                                    dayActivityCost += (ticket * groupSize) + extra;
                                    remainingDayBudget -= (ticket * groupSize) + extra;
                                    visitedLocationIds.Add(loc.Id);
                                    currentTime = AddMinutes(visitEnd, BufferAfterActivity);
                                }
                            }
                        }
                        else
                        {

                        // Travel from hotel/current location to departure transit hub
                        {
                            var departureHubPoint = new GeoPoint("Hub", prevProvince.Latitude ?? 0, prevProvince.Longitude ?? 0);
                            var toHubTransport = await BuildLocalTransportAsync(
                                prevAccom is not null ? GeoPoint.FromLocation(prevAccom) : new GeoPoint(prevProvince.EnglishName!, prevProvince.Latitude ?? 0, prevProvince.Longitude ?? 0),
                                departureHubPoint, groupSize, transportModes, toMoney, cancellationToken);
                            var toHubArrival = AddMinutes(currentTime, toHubTransport.SelectedTravelTimeMinutes);

                            var toHubLeg = new LocationToTransitHubTravelLegDto(
                                prevAccom?.Id ?? 0, prevAccom?.Name ?? "Unknown", segRecOpt.FromTransitHubId, segRecOpt.FromTransitHubName ?? "",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(toHubArrival),
                                toHubTransport.DistanceKm, null,
                                0, toMoney(0),
                                toHubTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Transfer to station / airport",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(toHubArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                LocationToTransitHubTravel: toHubLeg));
                            dayTransportCost += toHubTransport.SelectedTotalCost;
                            currentTime = AddMinutes(toHubArrival, 10);
                        }

                        var segArrival = TimeOnly.FromDateTime(AddMinutes(currentTime, segRecOpt.EstimatedTravelMinutes));
                        var segLeg = new ProvinceToProvinceTravelLegDto(
                            segTransport.FromProvinceId, segTransport.FromProvinceName,
                            segTransport.ToProvinceId, segTransport.ToProvinceName,
                            TimeOnly.FromDateTime(currentTime), segArrival,
                            segTransport.DistanceKm, null,
                            0, toMoney(0),
                            segTransport.TransportOptions);
                        timeline.Add(new ItineraryTimelineItemDto("travel",
                            "Intercity transfer",
                            TimeOnly.FromDateTime(currentTime), segArrival,
                            0, new List<string>(),
                            null, null, null, "", 0,
                            ProvinceToProvinceTravel: segLeg));
                        dayTransportCost += segRecOpt.EstimatedTotalCost.BaseAmount;
                        currentTime = AddMinutes(currentTime, segRecOpt.EstimatedTravelMinutes + 20);
                        currentLocationName = segRecOpt.ToTransitHubName;

                        // Transport from hub to hotel or first attraction at new destination
                        {
                            GeoPoint segHubToTarget;
                            int segHubToTargetId;
                            string segHubToTargetName;
                            if (destAccommodation is not null)
                            {
                                segHubToTarget = GeoPoint.FromLocation(destAccommodation);
                                segHubToTargetId = destAccommodation.Id;
                                segHubToTargetName = destAccommodation.Name;
                            }
                            else
                            {
                                var firstAttr = destAttractions.FirstOrDefault()?.Location;
                                if (firstAttr is not null)
                                {
                                    segHubToTarget = GeoPoint.FromLocation(firstAttr);
                                    segHubToTargetId = firstAttr.Id;
                                    segHubToTargetName = firstAttr.Name;
                                }
                                else
                                {
                                    segHubToTarget = new GeoPoint(currentProvince.EnglishName!, currentProvince.Latitude ?? 0, currentProvince.Longitude ?? 0);
                                    segHubToTargetId = 0;
                                    segHubToTargetName = currentProvince.EnglishName!;
                                }
                            }

                            var segHubTransport = await BuildLocalTransportAsync(
                                new GeoPoint("Hub", orderedDestinations[destIdx].Latitude ?? 0, orderedDestinations[destIdx].Longitude ?? 0),
                                segHubToTarget, groupSize, transportModes, toMoney, cancellationToken);
                            var segHubArrival = AddMinutes(currentTime, segHubTransport.SelectedTravelTimeMinutes);
                            var segHubLeg = new TransitHubToLocationTravelLegDto(
                                segRecOpt.ToTransitHubId, segRecOpt.ToTransitHubName ?? "", segHubToTargetId, segHubToTargetName,
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(segHubArrival),
                                segHubTransport.DistanceKm, null,
                                0, toMoney(0),
                                segHubTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Local transfer",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(segHubArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                TransitHubToLocationTravel: segHubLeg));
                            dayTransportCost += segHubTransport.SelectedTotalCost;
                            currentTime = AddMinutes(segHubArrival, 10);
                            currentPoint = segHubToTarget;
                            currentLocationName = segHubToTargetName;
                        }

                        } // end else (has transit hub support)

                        if (destAccommodation is not null)
                        {
                            var interDestCheckInThreshold = date.ToDateTime(new TimeOnly(14, 0));

                            if (currentTime < interDestCheckInThreshold)
                            {
                                // Early arrival at new destination: luggage drop then explore
                                var luggageStart2 = currentTime;
                                var luggageEnd2 = AddMinutes(luggageStart2, 15);
                                var accomAltsEarly2 = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                                var luggageTagNames2 = GetTags(destAccommodation);

                                var accomRecsEarly2 = accommodationRecommendations
                                    .Where(r => {
                                        var hotel = accommodations.FirstOrDefault(a => a.Id == r.LocationId);
                                        return hotel is not null && hotel.District != null && hotel.District.ProvinceId.HasValue && hotel.District.ProvinceId.Value == currentProvince.Id;
                                    }).ToList();

                                timeline.Add(new ItineraryTimelineItemDto("luggage-drop",
                                    $"Drop luggage at {destAccommodation.Name}",
                                    TimeOnly.FromDateTime(luggageStart2), TimeOnly.FromDateTime(luggageEnd2),
                                    destAccommodation.Id, luggageTagNames2,
                                    toMoney(0), toMoney(0), toMoney(0), "Drop off luggage before check-in time, explore the area first",
                                    Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                    Alternatives: accomAltsEarly2 is { Count: > 0 } ? accomAltsEarly2 : null,
                                    AccommodationRecommendations: accomRecsEarly2.Count > 0 ? accomRecsEarly2 : null));
                                currentTime = AddMinutes(luggageEnd2, 10);
                                currentPoint = GeoPoint.FromLocation(destAccommodation);
                                currentLocationName = destAccommodation.Name;
                                currentLocationId = destAccommodation.Id;
                                checkInDeferred = true;
                            }
                            else
                            {
                                var checkInStart = currentTime;
                                var checkInEnd = AddMinutes(checkInStart, 30);
                                var accomAlts2 = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                                var checkIn2TagNames = GetTags(destAccommodation);
                                
                                var accomRecsForCheckIn2 = accommodationRecommendations
                                    .Where(r => {
                                        var hotel = accommodations.FirstOrDefault(a => a.Id == r.LocationId);
                                        return hotel is not null && hotel.District != null && hotel.District.ProvinceId.HasValue && hotel.District.ProvinceId.Value == currentProvince.Id;
                                    }).ToList();
                                
                                timeline.Add(new ItineraryTimelineItemDto("check-in",
                                    $"Check in at {destAccommodation.Name}",
                                    TimeOnly.FromDateTime(checkInStart), TimeOnly.FromDateTime(checkInEnd),
                                    destAccommodation.Id, checkIn2TagNames,
                                    toMoney(0), toMoney(0), toMoney(0), "Check in to room",
                                    Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                    Alternatives: accomAlts2 is { Count: > 0 } ? accomAlts2 : null,
                                    AccommodationRecommendations: accomRecsForCheckIn2.Count > 0 ? accomRecsForCheckIn2 : null));
                                currentTime = AddMinutes(checkInEnd, 10);
                                currentPoint = GeoPoint.FromLocation(destAccommodation);
                                currentLocationName = destAccommodation.Name;
                                currentLocationId = destAccommodation.Id;
                            }
                        }
                    }
                    // === Normal day (same destination) ===
                    else
                    {
                        if (destAccommodation is not null)
                        {
                            currentPoint = GeoPoint.FromLocation(destAccommodation);
                            currentLocationName = destAccommodation.Name;
                            currentLocationId = destAccommodation.Id;
                        }
                        else if (prevDayLastPoint is not null)
                        {
                            // No hotel: start from where the user ended the previous day
                            currentPoint = prevDayLastPoint;
                            currentLocationName = prevDayLastLocationName;
                            currentLocationId = prevDayLastLocationId;
                        }
                        else
                        {
                            currentPoint = new GeoPoint(currentProvince.EnglishName!, currentProvince.Latitude ?? 0, currentProvince.Longitude ?? 0);
                            currentLocationName = null;
                            currentLocationId = 0;
                        }
                        bool isAccomLastDayOfTrip = (globalDayIndex == totalDays - 1);
                        bool isAccomLastDayAtThisDest = (localDay == daysInDest - 1);
                        bool willAccomMoveToNewDestTomorrow = isAccomLastDayAtThisDest && (destIdx < orderedDestinations.Count - 1);

                        if (destAccommodation is not null && localDay > 0 && !isAccomLastDayOfTrip && !willAccomMoveToNewDestTomorrow)
                        {
                            var checkoutEnd = AddMinutes(currentTime, 15);
                            var refreshAlts = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                            var refreshTagNames = GetTags(destAccommodation);
                            var refreshPerPerson = GetPerPersonPrice(destAccommodation);
                            var refreshGroupCost = refreshPerPerson * groupSize;
                            timeline.Add(new ItineraryTimelineItemDto("luggage-refresh",
                                $"Room extension / luggage storage at {destAccommodation.Name}",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(checkoutEnd),
                                destAccommodation.Id, refreshTagNames,
                                toMoney(0), toMoney(refreshPerPerson), toMoney(refreshGroupCost), "Room extension or luggage storage",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                Alternatives: refreshAlts is { Count: > 0 } ? refreshAlts : null));
                            currentTime = AddMinutes(checkoutEnd, 10);
                            dayAccommodationCost += refreshGroupCost;
                        }
                    }

                    // === Greedy Activity Picker with Meal Injection ===
                    var dayOfWeek = date.DayOfWeek;

                    while (currentTime < dayEndTime.AddHours(-1))
                    {
                        var currentTimeOnly = TimeOnly.FromDateTime(currentTime);

                        // Inject Breakfast
                        if (!breakfastInserted && currentTimeOnly >= BreakfastStart && currentTimeOnly < BreakfastEnd)
                        {
                            var mealEnd = date.ToDateTime(BreakfastEnd);
                            if (mealEnd <= dayEndTime)
                            {
                                // Use breakfast-specific budget (remainingMealBudget tracked across days)
                                var breakfastPerPersonBudget = remainingMealBudget > 0
                                    ? (breakfastBudgetPerPerson + (remainingMealBudget / Math.Max(1, totalDays - globalDayIndex)))
                                    : breakfastBudgetPerPerson;
                                var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, visitedRestaurantIds, breakfastPerPersonBudget, groupSize, request.TripSegment, out var breakfastAlternatives, toMoney, recentlyVisitedLocationIds, favoriteTagIds);
                                var rLoc = restaurant?.Location;

                                // Local transport to restaurant
                                if (rLoc is not null)
                                {
                                    var restaurantPoint = GeoPoint.FromLocation(rLoc);
                                    var mealTransport = await BuildLocalTransportAsync(
                                        currentPoint, restaurantPoint, groupSize, transportModes, toMoney, cancellationToken);
                                    var mealArrival = AddMinutes(currentTime, mealTransport.SelectedTravelTimeMinutes);

                                    // Add travel leg
                                    var mealLeg = new LocationToLocationTravelLegDto(
                                        currentLocationId, currentLocationName ?? "Unknown",
                                        rLoc.Id, rLoc.Name,
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(mealArrival),
                                        mealTransport.DistanceKm, null,
                                        0, toMoney(0),
                                        mealTransport.TransportOptions);
                                    timeline.Add(new ItineraryTimelineItemDto("travel",
                                        "Local transfer",
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(mealArrival),
                                        0, new List<string>(),
                                        null, null, null, "", 0,
                                        LocationToLocationTravel: mealLeg));

                                    currentTime = mealArrival;
                                }

                                var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                                var mealGroupCost = mealExtraCost * groupSize;

                                // If restaurant exceeds budget, keep display costs but don't deduct from budget
                                var mealBudgetDeduction = mealGroupCost;
                                if (mealGroupCost > remainingMealBudget || (remainingDayBudget > 0 && mealGroupCost > remainingDayBudget))
                                {
                                    mealBudgetDeduction = 0m;
                                }

                                var breakfastTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                                var actualMealEnd = AddMinutes(currentTime, 45);
                                timeline.Add(new ItineraryTimelineItemDto("meal",
                                    rLoc is not null ? $"Breakfast at {rLoc.Name}" : "Breakfast",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(actualMealEnd),
                                    rLoc?.Id ?? 0, breakfastTagNames,
                                    toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), "Breakfast",
                                    rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                                    Alternatives: breakfastAlternatives.Count > 0 ? breakfastAlternatives : null));
                                totalMealCost += mealBudgetDeduction > 0 ? mealGroupCost : 0m;
                                dayMealCost += mealBudgetDeduction > 0 ? mealGroupCost : 0m;
                                remainingDayBudget -= mealBudgetDeduction;
                                remainingMealBudget -= mealBudgetDeduction;
                                currentTime = AddMinutes(actualMealEnd, BufferAfterMeal);
                                breakfastInserted = true;
                                if (rLoc is not null)
                                {
                                    currentPoint = GeoPoint.FromLocation(rLoc);
                                    currentLocationName = rLoc.Name;
                                    currentLocationId = rLoc.Id;
                                }

                                // === RULE 4: Post-breakfast morning activity insertion ===
                                // Try to insert a short, lightweight activity before lunch (~11:30)
                                var postBreakfastLunchStart = date.ToDateTime(LunchStart);
                                var currentTimeOnlyPostBreakfast = TimeOnly.FromDateTime(currentTime);
                                if (currentTimeOnlyPostBreakfast < LunchStart.AddMinutes(-30)) // Need at least 30 min before lunch window
                                {
                                    var morningAvailable = dayAttractions
                                        .Where(x => !visitedLocationIds.Contains(x.Location.Id))
                                        .ToList();
                                    if (morningAvailable.Count > 0)
                                    {
                                        var morningActivity = PickNextAttractionRandomized(
                                            morningAvailable, currentPoint, remainingDayBudget,
                                            currentTime, postBreakfastLunchStart, groupSize, date.DayOfWeek, request.TripSegment,
                                            recentlyVisitedLocationIds,
                                            out var morningAlternatives);

                                        if (morningActivity is not null)
                                        {
                                            var morningNextPoint = GeoPoint.FromLocation(morningActivity.Location);
                                            var morningLocalTransport = await BuildLocalTransportAsync(
                                                currentPoint, morningNextPoint, groupSize, transportModes, toMoney, cancellationToken);

                                            var morningArrival = AddMinutes(currentTime, morningLocalTransport.SelectedTravelTimeMinutes);
                                            var morningStayMinutes = morningActivity.Location.RecommendedDurationMinutes ?? DefaultStayMinutes;
                                            // Cap to fit before lunch
                                            var maxMorningStay = (int)(postBreakfastLunchStart - morningArrival).TotalMinutes - BufferAfterActivity;
                                            if (maxMorningStay >= 30) // Need at least 30 min visit
                                            {
                                                morningStayMinutes = Math.Min(morningStayMinutes, maxMorningStay);
                                                var morningActivityEnd = AddMinutes(morningArrival, morningStayMinutes);

                                                if (morningActivityEnd <= postBreakfastLunchStart &&
                                                    IsOpenAtTime(morningActivity.Location, date.DayOfWeek, TimeOnly.FromDateTime(morningArrival)))
                                                {
                                                    var morningTicketPerPerson = morningActivity.Location.TicketPrice;
                                                    var morningExtraSpending = EstimateExtraSpending(morningActivity.Location, request.TripSegment, groupSize);
                                                    var morningActivityGroupCost = (morningTicketPerPerson * groupSize) + morningExtraSpending + morningLocalTransport.SelectedTotalCost;

                                                    if (morningActivityGroupCost <= remainingDayBudget)
                                                    {
                                                        var morningLocalLeg = new LocationToLocationTravelLegDto(
                                                            currentLocationId, currentLocationName ?? "Unknown",
                                                            morningActivity.Location.Id, morningActivity.Location.Name,
                                                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(morningArrival),
                                                            morningLocalTransport.DistanceKm, null,
                                                            0, toMoney(0),
                                                            morningLocalTransport.TransportOptions);
                                                        timeline.Add(new ItineraryTimelineItemDto("travel",
                                                            "Morning local transfer",
                                                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(morningArrival),
                                                            0, new List<string>(),
                                                            null, null, null, "", 0,
                                                            LocationToLocationTravel: morningLocalLeg));

                                                        var morningExtraCostPerPerson = morningExtraSpending / groupSize;
                                                        var morningVisitTagNames = GetTags(morningActivity.Location);
                                                        var morningEventType = (morningActivity.Location.LocationTypeId == 5 ||
                                                            (morningActivity.Location.LocationType != null &&
                                                             morningActivity.Location.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                                                            ? "shopping" : "visit";

                                                        timeline.Add(new ItineraryTimelineItemDto(morningEventType,
                                                            morningEventType == "shopping" ? $"Morning shopping at {morningActivity.Location.Name}" : $"Morning visit to {morningActivity.Location.Name}",
                                                            TimeOnly.FromDateTime(morningArrival), TimeOnly.FromDateTime(morningActivityEnd),
                                                            morningActivity.Location.Id, morningVisitTagNames,
                                                            toMoney(morningTicketPerPerson), toMoney(morningExtraCostPerPerson),
                                                            toMoney((morningTicketPerPerson * groupSize) + morningExtraSpending),
                                                            $"Morning activity (score: {morningActivity.CompositeScore:F1})",
                                                            Math.Round((double)(morningActivity.Location.Score ?? 0), 2),
                                                            morningActivity.Location.Address, morningActivity.Location.Telephone, GetMediaUrls(morningActivity.Location)));

                                                        dayTransportCost += morningLocalTransport.SelectedTotalCost;
                                                        dayActivityCost += morningActivityGroupCost - morningLocalTransport.SelectedTotalCost;
                                                        remainingDayBudget -= morningActivityGroupCost;
                                                        visitedLocationIds.Add(morningActivity.Location.Id);
                                                        currentPoint = morningNextPoint;
                                                        currentLocationName = morningActivity.Location.Name;
                                                        currentLocationId = morningActivity.Location.Id;
                                                        currentTime = AddMinutes(morningActivityEnd, BufferAfterActivity);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                continue;
                            }
                        }

                        // === DEFERRED HOTEL CHECK-IN: return to hotel at standard check-in time (14:00) ===
                        if (checkInDeferred && destAccommodation is not null && currentTimeOnly >= new TimeOnly(14, 0))
                        {
                            // Travel to hotel from current location
                            var hotelPoint = GeoPoint.FromLocation(destAccommodation);
                            var toHotelTransport = await BuildLocalTransportAsync(
                                currentPoint, hotelPoint, groupSize, transportModes, toMoney, cancellationToken);
                            var toHotelArrival = AddMinutes(currentTime, toHotelTransport.SelectedTravelTimeMinutes);

                            if (toHotelTransport.DistanceKm > 0.1)
                            {
                                var toHotelLeg = new LocationToLocationTravelLegDto(
                                    currentLocationId, currentLocationName ?? "Unknown",
                                    destAccommodation.Id, destAccommodation.Name,
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(toHotelArrival),
                                    toHotelTransport.DistanceKm, null,
                                    0, toMoney(0),
                                    toHotelTransport.TransportOptions);
                                timeline.Add(new ItineraryTimelineItemDto("travel",
                                    "Return to hotel",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(toHotelArrival),
                                    0, new List<string>(),
                                    null, null, null, "", 0,
                                    LocationToLocationTravel: toHotelLeg));
                                dayTransportCost += toHotelTransport.SelectedTotalCost;
                                currentTime = AddMinutes(toHotelArrival, BufferAfterLocalTransfer);
                            }

                            var deferredCheckInStart = currentTime;
                            var deferredCheckInEnd = AddMinutes(deferredCheckInStart, 30);
                            var deferredAccomAlts = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                            var deferredCheckInTags = GetTags(destAccommodation);

                            var deferredAccomRecs = accommodationRecommendations
                                .Where(r => {
                                    var hotel = accommodations.FirstOrDefault(a => a.Id == r.LocationId);
                                    return hotel is not null && hotel.District != null && hotel.District.ProvinceId.HasValue && hotel.District.ProvinceId.Value == currentProvince.Id;
                                }).ToList();

                            timeline.Add(new ItineraryTimelineItemDto("check-in",
                                $"Check in at {destAccommodation.Name}",
                                TimeOnly.FromDateTime(deferredCheckInStart), TimeOnly.FromDateTime(deferredCheckInEnd),
                                destAccommodation.Id, deferredCheckInTags,
                                toMoney(0), toMoney(0), toMoney(0), "Check in to room",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                destAccommodation.Address, destAccommodation.Telephone, GetMediaUrls(destAccommodation),
                                Alternatives: deferredAccomAlts is { Count: > 0 } ? deferredAccomAlts : null,
                                AccommodationRecommendations: deferredAccomRecs.Count > 0 ? deferredAccomRecs : null));
                            currentTime = AddMinutes(deferredCheckInEnd, BufferAfterLocalTransfer);
                            currentPoint = hotelPoint;
                            currentLocationName = destAccommodation.Name;
                            currentLocationId = destAccommodation.Id;
                            checkInDeferred = false;
                            continue;
                        }

                        // Inject Lunch
                        if (!lunchInserted && currentTimeOnly >= LunchStart && currentTimeOnly < LunchEnd)
                        {
                            var mealEnd = date.ToDateTime(LunchEnd);
                            if (mealEnd <= dayEndTime)
                            {
                                // Use lunch-specific budget (remainingMealBudget tracked across days)
                                var lunchPerPersonBudget = remainingMealBudget > 0
                                    ? (lunchBudgetPerPerson + (remainingMealBudget / Math.Max(1, totalDays - globalDayIndex)))
                                    : lunchBudgetPerPerson;
                                var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, visitedRestaurantIds, lunchPerPersonBudget, groupSize, request.TripSegment, out var lunchAlternatives, toMoney, recentlyVisitedLocationIds, favoriteTagIds);
                                var rLoc = restaurant?.Location;

                                // Local transport to restaurant
                                if (rLoc is not null)
                                {
                                    var restaurantPoint = GeoPoint.FromLocation(rLoc);
                                    var mealTransport = await BuildLocalTransportAsync(
                                        currentPoint, restaurantPoint, groupSize, transportModes, toMoney, cancellationToken);
                                    var mealArrival = AddMinutes(currentTime, mealTransport.SelectedTravelTimeMinutes);

                                    var mealLeg = new LocationToLocationTravelLegDto(
                                        currentLocationId, currentLocationName ?? "Unknown",
                                        rLoc.Id, rLoc.Name,
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(mealArrival),
                                        mealTransport.DistanceKm, null,
                                        0, toMoney(0),
                                        mealTransport.TransportOptions);
                                    timeline.Add(new ItineraryTimelineItemDto("travel",
                                        "Local transfer",
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(mealArrival),
                                        0, new List<string>(),
                                        null, null, null, "", 0,
                                        LocationToLocationTravel: mealLeg));

                                    currentTime = mealArrival;
                                }

                                var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                                var mealGroupCost = mealExtraCost * groupSize;

                                // If restaurant exceeds budget, keep display costs but don't deduct from budget
                                var lunchBudgetDeduction = mealGroupCost;
                                if (mealGroupCost > remainingMealBudget || (remainingDayBudget > 0 && mealGroupCost > remainingDayBudget))
                                {
                                    lunchBudgetDeduction = 0m;
                                }

                                var lunchTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                                var actualMealEnd = AddMinutes(currentTime, 60);
                                timeline.Add(new ItineraryTimelineItemDto("meal",
                                    rLoc is not null ? $"Lunch at {rLoc.Name}" : "Lunch",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(actualMealEnd),
                                    rLoc?.Id ?? 0, lunchTagNames,
                                    toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), "Lunch",
                                    rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                                    Alternatives: lunchAlternatives.Count > 0 ? lunchAlternatives : null));
                                totalMealCost += lunchBudgetDeduction > 0 ? mealGroupCost : 0m;
                                dayMealCost += lunchBudgetDeduction > 0 ? mealGroupCost : 0m;
                                remainingDayBudget -= lunchBudgetDeduction;
                                remainingMealBudget -= lunchBudgetDeduction;
                                currentTime = AddMinutes(actualMealEnd, BufferAfterMeal);
                                lunchInserted = true;
                                if (rLoc is not null)
                                {
                                    currentPoint = GeoPoint.FromLocation(rLoc);
                                    currentLocationName = rLoc.Name;
                                    currentLocationId = rLoc.Id;
                                }
                                continue;
                            }
                        }

                        // Inject Dinner
                        if (!dinnerInserted && currentTimeOnly >= DinnerStart && currentTimeOnly < DinnerEnd)
                        {
                            var mealEnd = date.ToDateTime(DinnerEnd);
                            if (mealEnd <= dayEndTime)
                            {
                                // Use dinner-specific budget (remainingMealBudget tracked across days)
                                var dinnerPerPersonBudget = remainingMealBudget > 0
                                    ? (dinnerBudgetPerPerson + (remainingMealBudget / Math.Max(1, totalDays - globalDayIndex)))
                                    : dinnerBudgetPerPerson;
                                var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, visitedRestaurantIds, dinnerPerPersonBudget, groupSize, request.TripSegment, out var dinnerAlternatives, toMoney, recentlyVisitedLocationIds, favoriteTagIds);
                                var rLoc = restaurant?.Location;

                                // Local transport to restaurant
                                if (rLoc is not null)
                                {
                                    var restaurantPoint = GeoPoint.FromLocation(rLoc);
                                    var mealTransport = await BuildLocalTransportAsync(
                                        currentPoint, restaurantPoint, groupSize, transportModes, toMoney, cancellationToken);
                                    var mealArrival = AddMinutes(currentTime, mealTransport.SelectedTravelTimeMinutes);

                                    var mealLeg = new LocationToLocationTravelLegDto(
                                        currentLocationId, currentLocationName ?? "Unknown",
                                        rLoc.Id, rLoc.Name,
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(mealArrival),
                                        mealTransport.DistanceKm, null,
                                        0, toMoney(0),
                                        mealTransport.TransportOptions);
                                    timeline.Add(new ItineraryTimelineItemDto("travel",
                                        "Local transfer",
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(mealArrival),
                                        0, new List<string>(),
                                        null, null, null, "", 0,
                                        LocationToLocationTravel: mealLeg));

                                    currentTime = mealArrival;
                                }

                                var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                                var mealGroupCost = mealExtraCost * groupSize;

                                // If restaurant exceeds budget, keep display costs but don't deduct from budget
                                var dinnerBudgetDeduction = mealGroupCost;
                                if (mealGroupCost > remainingMealBudget || (remainingDayBudget > 0 && mealGroupCost > remainingDayBudget))
                                {
                                    dinnerBudgetDeduction = 0m;
                                }

                                var dinnerTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                                var actualMealEnd = AddMinutes(currentTime, 75);
                                timeline.Add(new ItineraryTimelineItemDto("meal",
                                    rLoc is not null ? $"Dinner at {rLoc.Name}" : "Dinner",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(actualMealEnd),
                                    rLoc?.Id ?? 0, dinnerTagNames,
                                    toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), "Dinner",
                                    rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                                    Alternatives: dinnerAlternatives.Count > 0 ? dinnerAlternatives : null));
                                totalMealCost += dinnerBudgetDeduction > 0 ? mealGroupCost : 0m;
                                dayMealCost += dinnerBudgetDeduction > 0 ? mealGroupCost : 0m;
                                remainingDayBudget -= dinnerBudgetDeduction;
                                remainingMealBudget -= dinnerBudgetDeduction;
                                currentTime = AddMinutes(actualMealEnd, BufferAfterMeal);
                                dinnerInserted = true;
                                if (rLoc is not null)
                                {
                                    currentPoint = GeoPoint.FromLocation(rLoc);
                                    currentLocationName = rLoc.Name;
                                    currentLocationId = rLoc.Id;
                                }
                                continue;
                            }
                        }

                        // Pick next attraction (avoiding duplicates across all days)
                        var available = dayAttractions.Where(x => !visitedLocationIds.Contains(x.Location.Id)).ToList();
                        if (available.Count == 0) break;

                        var nextAttraction = PickNextAttractionRandomized(
                            available, currentPoint, remainingDayBudget,
                            currentTime, dayEndTime, groupSize, dayOfWeek, request.TripSegment,
                            recentlyVisitedLocationIds,
                            out var alternativeCandidates);

                        if (nextAttraction is null) break;

                        var nextPoint = GeoPoint.FromLocation(nextAttraction.Location);
                        var localTransport = await BuildLocalTransportAsync(
                            currentPoint, nextPoint, groupSize, transportModes, toMoney, cancellationToken);

                        var activityArrival = AddMinutes(currentTime, localTransport.SelectedTravelTimeMinutes);
                        var stayMinutes = nextAttraction.Location.RecommendedDurationMinutes ?? DefaultStayMinutes;
                        var activityEnd = AddMinutes(activityArrival, stayMinutes);

                        if (activityEnd > dayEndTime) break;

                        if (!IsOpenAtTime(nextAttraction.Location, dayOfWeek, TimeOnly.FromDateTime(activityArrival)))
                        {
                            visitedLocationIds.Add(nextAttraction.Location.Id);
                            continue;
                        }

                        var ticketPerPerson = nextAttraction.Location.TicketPrice;
                        var extraSpending = EstimateExtraSpending(nextAttraction.Location, request.TripSegment, groupSize);
                        var activityGroupCost = (ticketPerPerson * groupSize) + extraSpending + localTransport.SelectedTotalCost;

                        // If budget exceeded, still add activity but don't deduct from budget
                        var activityBudgetDeduction = activityGroupCost;
                        if (activityGroupCost > remainingDayBudget)
                        {
                            activityBudgetDeduction = 0m;
                        }

                        // Add local travel leg as timeline event
                        var localLeg = new LocationToLocationTravelLegDto(
                            currentLocationId, currentLocationName ?? "Unknown",
                            nextAttraction.Location.Id, nextAttraction.Location.Name,
                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(activityArrival),
                            localTransport.DistanceKm, null,
                            0, toMoney(0),
                            localTransport.TransportOptions);
                        timeline.Add(new ItineraryTimelineItemDto("travel",
                            "Local transfer",
                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(activityArrival),
                            0, new List<string>(),
                            null, null, null, "", 0,
                            LocationToLocationTravel: localLeg));

                        var extraCostPerPerson = extraSpending / groupSize;

                        var alternativeLocations = alternativeCandidates
                            .Where(a => a.Location.Id != nextAttraction.Location.Id)
                            .Where(a => !visitedLocationIds.Contains(a.Location.Id))
                            .Take(3)
                            .Select(a =>
                            {
                                var altDist = HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude,
                                    a.Location.Latitude, a.Location.Longitude);
                                var altTravelMin = (int)Math.Ceiling((altDist / DefaultSpeedKmh) * 60.0);
                                var altTicket = a.Location.TicketPrice;
                                var altExtra = EstimateExtraSpending(a.Location, request.TripSegment, groupSize) / groupSize;
                                var altCostForGroup = (altTicket * groupSize) + (altExtra * groupSize);
                                var altTagNames = GetTags(a.Location);
                                return new AlternativeLocationDto(
                                    a.Location.Id, a.Location.Name, altTagNames,
                                    toMoney(altTicket), toMoney(altExtra),
                                    toMoney(altCostForGroup),
                                    Math.Round((double)(a.Location.Score ?? 0), 2),
                                    Math.Round(altDist, 2), altTravelMin,
                                    a.Location.Address, a.Location.Telephone, GetMediaUrls(a.Location));
                            }).ToList();

                        var visitTagNames = GetTags(nextAttraction.Location);
                        
                        // Determine event type: "shopping" for shopping locations, "visit" for attractions
                        var eventType = (nextAttraction.Location.LocationTypeId == 5 ||
                            (nextAttraction.Location.LocationType != null && 
                             nextAttraction.Location.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                            ? "shopping"
                            : "visit";
                        
                        timeline.Add(new ItineraryTimelineItemDto(eventType,
                            eventType == "shopping" ? $"Shopping at {nextAttraction.Location.Name}" : $"Visit {nextAttraction.Location.Name}",
                            TimeOnly.FromDateTime(activityArrival), TimeOnly.FromDateTime(activityEnd),
                            nextAttraction.Location.Id, visitTagNames,
                            toMoney(ticketPerPerson), toMoney(extraCostPerPerson),
                            toMoney((ticketPerPerson * groupSize) + extraSpending),
                            $"Score: {nextAttraction.CompositeScore:F1}",
                            Math.Round((double)(nextAttraction.Location.Score ?? 0), 2),
                            nextAttraction.Location.Address, nextAttraction.Location.Telephone, GetMediaUrls(nextAttraction.Location),
                            Alternatives: alternativeLocations.Count > 0 ? alternativeLocations : null));

                        dayTransportCost += activityBudgetDeduction > 0 ? localTransport.SelectedTotalCost : 0m;
                        dayActivityCost += activityBudgetDeduction > 0 ? activityGroupCost - localTransport.SelectedTotalCost : 0m;
                        remainingDayBudget -= activityBudgetDeduction;

                        visitedLocationIds.Add(nextAttraction.Location.Id);
                        currentPoint = nextPoint;
                        currentLocationName = nextAttraction.Location.Name;
                        currentLocationId = nextAttraction.Location.Id;
                        currentTime = AddMinutes(activityEnd, BufferAfterActivity);
                    }

                    // === RULE 1: Inject dinner BEFORE returning to accommodation (skip on multi-day last day) ===
                    // Dinner is placed in the evening window (17:30-20:30) using actual current time
                    // Single-day trips always get dinner since there's no early departure
                    if (!dinnerInserted && (globalDayIndex != totalDays - 1 || totalDays == 1))
                    {
                        var currentTimeOnlyForDinner = TimeOnly.FromDateTime(currentTime);
                        // Check if we're in or before the dinner window
                        if (currentTimeOnlyForDinner <= DinnerEnd)
                        {
                            // Use dinner-specific budget (remainingMealBudget tracked across days)
                            var dinnerPerPersonBudget = remainingMealBudget > 0
                                ? (dinnerBudgetPerPerson + (remainingMealBudget / Math.Max(1, totalDays - globalDayIndex)))
                                : dinnerBudgetPerPerson;
                            var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, visitedRestaurantIds, dinnerPerPersonBudget, groupSize, request.TripSegment, out var lateDinnerAlts, toMoney, recentlyVisitedLocationIds, favoriteTagIds);
                            var rLoc = restaurant?.Location;
                            var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                            var mealGroupCost = mealExtraCost * groupSize;

                            // If restaurant exceeds budget, keep display costs but don't deduct from budget
                            var lateDinnerBudgetDeduction = mealGroupCost;
                            if (mealGroupCost > remainingMealBudget || (remainingDayBudget > 0 && mealGroupCost > remainingDayBudget))
                            {
                                lateDinnerBudgetDeduction = 0m;
                            }

                            // If we haven't hit the dinner window yet, schedule at DinnerStart
                            // Otherwise use current time
                            var dinnerActualStart = currentTimeOnlyForDinner < DinnerStart ? DinnerStart : currentTimeOnlyForDinner;
                            var dinnerActualEnd = AddMinutes(date.ToDateTime(dinnerActualStart), 75);

                            var lateDinnerTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                            timeline.Add(new ItineraryTimelineItemDto("meal",
                                rLoc is not null ? $"Dinner at {rLoc.Name}" : "Dinner",
                                dinnerActualStart, TimeOnly.FromDateTime(dinnerActualEnd),
                                rLoc?.Id ?? 0, lateDinnerTagNames,
                                toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), "Dinner",
                                rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                                Alternatives: lateDinnerAlts.Count > 0 ? lateDinnerAlts : null));
                            totalMealCost += lateDinnerBudgetDeduction > 0 ? mealGroupCost : 0m;
                            dayMealCost += lateDinnerBudgetDeduction > 0 ? mealGroupCost : 0m;
                            remainingDayBudget -= lateDinnerBudgetDeduction;
                            remainingMealBudget -= lateDinnerBudgetDeduction;
                            currentTime = AddMinutes(dinnerActualEnd, BufferAfterMeal);
                            dinnerInserted = true;

                            if (rLoc is not null)
                            {
                                currentPoint = GeoPoint.FromLocation(rLoc);
                                currentLocationName = rLoc.Name;
                                currentLocationId = rLoc.Id;
                            }
                        }
                    }

                    // === RULE 3: Post-dinner activities before returning to accommodation ===
                    // Try to insert a lightweight activity after dinner before hotel return (must end before 22:00)
                    // Single-day trips can also have post-dinner activities
                    if (dinnerInserted && (globalDayIndex != totalDays - 1 || totalDays == 1))
                    {
                        var postDinnerEndTime = date.ToDateTime(PostDinnerActivityEnd);
                        while (currentTime < postDinnerEndTime.AddMinutes(-60)) // Need at least 60 min for activity
                        {
                            var availablePostDinner = dayAttractions
                                .Where(x => !visitedLocationIds.Contains(x.Location.Id))
                                .ToList();
                            if (availablePostDinner.Count == 0) break;

                            var postDinnerActivity = PickNextAttractionRandomized(
                                availablePostDinner, currentPoint, remainingDayBudget,
                                currentTime, postDinnerEndTime, groupSize, date.DayOfWeek, request.TripSegment,
                                recentlyVisitedLocationIds,
                                out var postDinnerAlternatives);

                            if (postDinnerActivity is null) break;

                            var postDinnerNextPoint = GeoPoint.FromLocation(postDinnerActivity.Location);
                            var postDinnerLocalTransport = await BuildLocalTransportAsync(
                                currentPoint, postDinnerNextPoint, groupSize, transportModes, toMoney, cancellationToken);

                            var postDinnerArrival = AddMinutes(currentTime, postDinnerLocalTransport.SelectedTravelTimeMinutes);
                            var postDinnerStayMinutes = postDinnerActivity.Location.RecommendedDurationMinutes ?? DefaultStayMinutes;
                            // Cap post-dinner activity to fit before 22:00
                            var maxPostDinnerStay = (int)(postDinnerEndTime - postDinnerArrival).TotalMinutes - BufferAfterActivity;
                            if (maxPostDinnerStay < 30) break; // Too short, skip
                            postDinnerStayMinutes = Math.Min(postDinnerStayMinutes, maxPostDinnerStay);
                            var postDinnerActivityEnd = AddMinutes(postDinnerArrival, postDinnerStayMinutes);

                            if (postDinnerActivityEnd > postDinnerEndTime) break;
                            if (!IsOpenAtTime(postDinnerActivity.Location, date.DayOfWeek, TimeOnly.FromDateTime(postDinnerArrival)))
                            {
                                visitedLocationIds.Add(postDinnerActivity.Location.Id);
                                continue;
                            }

                            var postDinnerTicketPerPerson = postDinnerActivity.Location.TicketPrice;
                            var postDinnerExtraSpending = EstimateExtraSpending(postDinnerActivity.Location, request.TripSegment, groupSize);
                            var postDinnerActivityGroupCost = (postDinnerTicketPerPerson * groupSize) + postDinnerExtraSpending + postDinnerLocalTransport.SelectedTotalCost;

                            // If budget exceeded, still add activity but don't deduct from budget
                            var postDinnerBudgetDeduction = postDinnerActivityGroupCost;
                            if (postDinnerActivityGroupCost > remainingDayBudget)
                            {
                                postDinnerBudgetDeduction = 0m;
                            }

                            // Add travel leg
                            var postDinnerLocalLeg = new LocationToLocationTravelLegDto(
                                currentLocationId, currentLocationName ?? "Unknown",
                                postDinnerActivity.Location.Id, postDinnerActivity.Location.Name,
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(postDinnerArrival),
                                postDinnerLocalTransport.DistanceKm, null,
                                0, toMoney(0),
                                postDinnerLocalTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Evening local transfer",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(postDinnerArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                LocationToLocationTravel: postDinnerLocalLeg));

                            var postDinnerExtraCostPerPerson = postDinnerExtraSpending / groupSize;
                            var postDinnerVisitTagNames = GetTags(postDinnerActivity.Location);

                            var postDinnerEventType = (postDinnerActivity.Location.LocationTypeId == 5 ||
                                (postDinnerActivity.Location.LocationType != null &&
                                 postDinnerActivity.Location.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                                ? "shopping"
                                : "visit";

                            var postDinnerAlternativesDtos = postDinnerAlternatives
                                .Where(a => a.Location.Id != postDinnerActivity.Location.Id)
                                .Where(a => !visitedLocationIds.Contains(a.Location.Id))
                                .Take(3)
                                .Select(a =>
                                {
                                    var altDist = HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude,
                                        a.Location.Latitude, a.Location.Longitude);
                                    var altTravelMin = (int)Math.Ceiling((altDist / DefaultSpeedKmh) * 60.0);
                                    var altTicket = a.Location.TicketPrice;
                                    var altExtra = EstimateExtraSpending(a.Location, request.TripSegment, groupSize) / groupSize;
                                    var altCostForGroup = (altTicket * groupSize) + (altExtra * groupSize);
                                    var altTagNames = GetTags(a.Location);
                                    return new AlternativeLocationDto(
                                        a.Location.Id, a.Location.Name, altTagNames,
                                        toMoney(altTicket), toMoney(altExtra),
                                        toMoney(altCostForGroup),
                                        Math.Round((double)(a.Location.Score ?? 0), 2),
                                        Math.Round(altDist, 2), altTravelMin,
                                        a.Location.Address, a.Location.Telephone, GetMediaUrls(a.Location));
                                }).ToList();

                            timeline.Add(new ItineraryTimelineItemDto(postDinnerEventType,
                                postDinnerEventType == "shopping" ? $"Evening shopping at {postDinnerActivity.Location.Name}" : $"Evening visit to {postDinnerActivity.Location.Name}",
                                TimeOnly.FromDateTime(postDinnerArrival), TimeOnly.FromDateTime(postDinnerActivityEnd),
                                postDinnerActivity.Location.Id, postDinnerVisitTagNames,
                                toMoney(postDinnerTicketPerPerson), toMoney(postDinnerExtraCostPerPerson),
                                toMoney((postDinnerTicketPerPerson * groupSize) + postDinnerExtraSpending),
                                $"Evening activity (score: {postDinnerActivity.CompositeScore:F1})",
                                Math.Round((double)(postDinnerActivity.Location.Score ?? 0), 2),
                                postDinnerActivity.Location.Address, postDinnerActivity.Location.Telephone, GetMediaUrls(postDinnerActivity.Location),
                                Alternatives: postDinnerAlternativesDtos.Count > 0 ? postDinnerAlternativesDtos : null));

                            dayTransportCost += postDinnerBudgetDeduction > 0 ? postDinnerLocalTransport.SelectedTotalCost : 0m;
                            dayActivityCost += postDinnerBudgetDeduction > 0 ? postDinnerActivityGroupCost - postDinnerLocalTransport.SelectedTotalCost : 0m;
                            remainingDayBudget -= postDinnerBudgetDeduction;

                            visitedLocationIds.Add(postDinnerActivity.Location.Id);
                            currentPoint = postDinnerNextPoint;
                            currentLocationName = postDinnerActivity.Location.Name;
                            currentLocationId = postDinnerActivity.Location.Id;
                            currentTime = AddMinutes(postDinnerActivityEnd, BufferAfterActivity);
                        }
                    }

                    // Travel back to hotel at end of day (if not already there and not last day)
                    // RULE 1: This happens AFTER dinner and any post-dinner activities
                    if (destAccommodation is not null && globalDayIndex != totalDays - 1 && currentLocationName != destAccommodation.Name)
                    {
                        var hotelPoint = GeoPoint.FromLocation(destAccommodation);
                        var returnToHotelTransport = await BuildLocalTransportAsync(
                            currentPoint, hotelPoint, groupSize, transportModes, toMoney, cancellationToken);
                        var returnToHotelArrival = AddMinutes(currentTime, returnToHotelTransport.SelectedTravelTimeMinutes);

                        var returnToHotelLeg = new LocationToLocationTravelLegDto(
                            currentLocationId, currentLocationName ?? "Unknown",
                            destAccommodation.Id, destAccommodation.Name,
                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(returnToHotelArrival),
                            returnToHotelTransport.DistanceKm, null,
                            0, toMoney(0),
                            returnToHotelTransport.TransportOptions);
                        timeline.Add(new ItineraryTimelineItemDto("travel",
                            $"Return to {destAccommodation.Name}",
                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(returnToHotelArrival),
                            0, new List<string>(),
                            null, null, null, "", 0,
                            LocationToLocationTravel: returnToHotelLeg));

                        dayTransportCost += returnToHotelTransport.SelectedTotalCost;
                        currentTime = AddMinutes(returnToHotelArrival, BufferAfterHotelReturn);
                        currentPoint = hotelPoint;
                        currentLocationName = destAccommodation.Name;
                        currentLocationId = destAccommodation.Id;
                    }

                    // Evening check-in (for all days except the last day and the first day at a new destination which already checked in earlier)
                    if (destAccommodation is not null && globalDayIndex != totalDays - 1 && !(localDay == 0 && destIdx > 0))
                    {
                        var eveningCheckInStart = Max(currentTime, date.ToDateTime(new TimeOnly(21, 0)));
                        if (eveningCheckInStart < dayEndTime.AddHours(1))
                        {
                            var ciEnd = AddMinutes(eveningCheckInStart, 20);
                            var eveningAlts = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                            var eveningTagNames = GetTags(destAccommodation);

                            // Get accommodation recommendations for this province
                            var eveningAccomRecs = accommodationRecommendations
                                .Where(r => {
                                    var hotel = accommodations.FirstOrDefault(a => a.Id == r.LocationId);
                                    return hotel is not null && hotel.District != null && hotel.District.ProvinceId.HasValue && hotel.District.ProvinceId.Value == currentProvince.Id;
                                }).ToList();

                            timeline.Add(new ItineraryTimelineItemDto("hotel-return",
                                $"Return to {destAccommodation.Name}",
                                TimeOnly.FromDateTime(eveningCheckInStart), TimeOnly.FromDateTime(ciEnd),
                                destAccommodation.Id, eveningTagNames,
                                toMoney(0), toMoney(0), toMoney(0), "Return to hotel for evening rest",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                Alternatives: eveningAlts is { Count: > 0 } ? eveningAlts : null,
                                AccommodationRecommendations: eveningAccomRecs.Count > 0 ? eveningAccomRecs : null));
                        }
                    }

                    // === RULES 5, 6, 7: Final day — breakfast → activities → lunch → checkout → departure ===
                    if (globalDayIndex == totalDays - 1)
                    {
                        var lastDayCheckoutTime = date.ToDateTime(new TimeOnly(12, 0));
                        var currentTimeOnlyLastDay = TimeOnly.FromDateTime(currentTime);
                        if (currentTimeOnlyLastDay < new TimeOnly(11, 30) && destAccommodation is not null)
                        {
                            // Try a short activity before lunch
                            var lastDayLunchTime = date.ToDateTime(LunchStart);
                            var lastDayMorningAvailable = dayAttractions
                                .Where(x => !visitedLocationIds.Contains(x.Location.Id))
                                .ToList();
                            if (lastDayMorningAvailable.Count > 0)
                            {
                                var lastDayMorningActivity = PickNextAttractionRandomized(
                                    lastDayMorningAvailable, currentPoint, remainingDayBudget,
                                    currentTime, lastDayLunchTime, groupSize, date.DayOfWeek, request.TripSegment,
                                    recentlyVisitedLocationIds,
                                    out _);

                                if (lastDayMorningActivity is not null)
                                {
                                    var ldMorningNextPoint = GeoPoint.FromLocation(lastDayMorningActivity.Location);
                                    var ldMorningTransport = await BuildLocalTransportAsync(
                                        currentPoint, ldMorningNextPoint, groupSize, transportModes, toMoney, cancellationToken);
                                    var ldMorningArrival = AddMinutes(currentTime, ldMorningTransport.SelectedTravelTimeMinutes);
                                    var ldMorningStay = Math.Min(
                                        lastDayMorningActivity.Location.RecommendedDurationMinutes ?? DefaultStayMinutes,
                                        Math.Max(30, (int)(lastDayLunchTime - ldMorningArrival).TotalMinutes - BufferAfterActivity));

                                    if (ldMorningStay >= 30 &&
                                        (ldMorningArrival.AddMinutes(ldMorningStay + BufferAfterActivity)) <= lastDayLunchTime &&
                                        IsOpenAtTime(lastDayMorningActivity.Location, date.DayOfWeek, TimeOnly.FromDateTime(ldMorningArrival)))
                                    {
                                        var ldMorningCost = (lastDayMorningActivity.Location.TicketPrice * groupSize) +
                                            EstimateExtraSpending(lastDayMorningActivity.Location, request.TripSegment, groupSize) +
                                            ldMorningTransport.SelectedTotalCost;

                                        var ldMorningBudgetDeduction = ldMorningCost;
                                        if (ldMorningCost > remainingDayBudget)
                                        {
                                            ldMorningBudgetDeduction = 0m;
                                        }

                                        {
                                            var ldMorningLeg = new LocationToLocationTravelLegDto(
                                                currentLocationId, currentLocationName ?? "Unknown",
                                                lastDayMorningActivity.Location.Id, lastDayMorningActivity.Location.Name,
                                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(ldMorningArrival),
                                                ldMorningTransport.DistanceKm, null, 0, toMoney(0),
                                                ldMorningTransport.TransportOptions);
                                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                                "Morning local transfer",
                                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(ldMorningArrival),
                                                0, new List<string>(), null, null, null, "", 0,
                                                LocationToLocationTravel: ldMorningLeg));

                                            var ldMorningEventType = (lastDayMorningActivity.Location.LocationTypeId == 5 ||
                                                (lastDayMorningActivity.Location.LocationType != null &&
                                                 lastDayMorningActivity.Location.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                                                ? "shopping" : "visit";
                                            var ldMorningTags = GetTags(lastDayMorningActivity.Location);
                                            var ldMorningEnd = AddMinutes(ldMorningArrival, ldMorningStay);
                                            var ldMorningExtraPerPerson = EstimateExtraSpending(lastDayMorningActivity.Location, request.TripSegment, groupSize) / groupSize;

                                            timeline.Add(new ItineraryTimelineItemDto(ldMorningEventType,
                                                ldMorningEventType == "shopping" ? $"Morning shopping at {lastDayMorningActivity.Location.Name}" : $"Morning visit to {lastDayMorningActivity.Location.Name}",
                                                TimeOnly.FromDateTime(ldMorningArrival), TimeOnly.FromDateTime(ldMorningEnd),
                                                lastDayMorningActivity.Location.Id, ldMorningTags,
                                                toMoney(lastDayMorningActivity.Location.TicketPrice), toMoney(ldMorningExtraPerPerson),
                                                toMoney(ldMorningCost), $"Final day morning activity",
                                                Math.Round((double)(lastDayMorningActivity.Location.Score ?? 0), 2),
                                                lastDayMorningActivity.Location.Address, lastDayMorningActivity.Location.Telephone, GetMediaUrls(lastDayMorningActivity.Location)));

                                            dayTransportCost += ldMorningBudgetDeduction > 0 ? ldMorningTransport.SelectedTotalCost : 0m;
                                            dayActivityCost += ldMorningBudgetDeduction > 0 ? ldMorningCost - ldMorningTransport.SelectedTotalCost : 0m;
                                            remainingDayBudget -= ldMorningBudgetDeduction;
                                            visitedLocationIds.Add(lastDayMorningActivity.Location.Id);
                                            currentPoint = ldMorningNextPoint;
                                            currentLocationName = lastDayMorningActivity.Location.Name;
                                            currentLocationId = lastDayMorningActivity.Location.Id;
                                            currentTime = AddMinutes(ldMorningEnd, BufferAfterActivity);
                                        }
                                    }
                                }
                            }
                        }

                        // === Lunch on final day before checkout ===
                        var currentTimeOnlyBeforeLunch = TimeOnly.FromDateTime(currentTime);
                        if (!lunchInserted && currentTimeOnlyBeforeLunch < LunchEnd)
                        {
                            // Ensure lunch does not start before LunchStart (11:30)
                            var lunchStartTime = Max(currentTime, date.ToDateTime(LunchStart));

                            var lunchPerPersonBudget = remainingMealBudget > 0
                                ? (lunchBudgetPerPerson + (remainingMealBudget / Math.Max(1, totalDays - globalDayIndex)))
                                : lunchBudgetPerPerson;
                            var lastDayRestaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, visitedRestaurantIds, lunchPerPersonBudget, groupSize, request.TripSegment, out var lastDayLunchAlts, toMoney, recentlyVisitedLocationIds, favoriteTagIds);
                            var ldRLoc = lastDayRestaurant?.Location;

                            // Local transport to farewell lunch restaurant
                            if (ldRLoc is not null)
                            {
                                var ldRestaurantPoint = GeoPoint.FromLocation(ldRLoc);
                                var ldMealTransport = await BuildLocalTransportAsync(
                                    currentPoint, ldRestaurantPoint, groupSize, transportModes, toMoney, cancellationToken);
                                var ldMealArrival = AddMinutes(lunchStartTime, ldMealTransport.SelectedTravelTimeMinutes);

                                var ldMealLeg = new LocationToLocationTravelLegDto(
                                    currentLocationId, currentLocationName ?? "Unknown",
                                    ldRLoc.Id, ldRLoc.Name,
                                    TimeOnly.FromDateTime(lunchStartTime), TimeOnly.FromDateTime(ldMealArrival),
                                    ldMealTransport.DistanceKm, null,
                                    0, toMoney(0),
                                    ldMealTransport.TransportOptions);
                                timeline.Add(new ItineraryTimelineItemDto("travel",
                                    "Local transfer",
                                    TimeOnly.FromDateTime(lunchStartTime), TimeOnly.FromDateTime(ldMealArrival),
                                    0, new List<string>(),
                                    null, null, null, "", 0,
                                    LocationToLocationTravel: ldMealLeg));

                                lunchStartTime = ldMealArrival;
                            }

                            var ldMealExtraCost = ldRLoc is not null ? GetPerPersonPrice(ldRLoc) : 0m;
                            var ldMealGroupCost = ldRLoc is not null ? ldMealExtraCost * groupSize : 0m;

                            // If restaurant exceeds budget, keep display costs but don't deduct from budget
                            var ldLunchBudgetDeduction = ldMealGroupCost;
                            if (ldMealGroupCost > remainingMealBudget || ldMealGroupCost > remainingDayBudget)
                            {
                                ldLunchBudgetDeduction = 0m;
                            }

                            var ldLunchDuration = 60;
                            var ldLunchEnd = AddMinutes(lunchStartTime, ldLunchDuration);
                            // Ensure lunch ends before or around checkout time
                            if (ldLunchEnd > lastDayCheckoutTime.AddMinutes(-30))
                            {
                                ldLunchEnd = lastDayCheckoutTime.AddMinutes(-30);
                                ldLunchDuration = (int)(ldLunchEnd - lunchStartTime).TotalMinutes;
                                if (ldLunchDuration < 30) ldLunchDuration = 30;
                                ldLunchEnd = AddMinutes(lunchStartTime, ldLunchDuration);
                            }

                            var ldLunchTags = ldRLoc is not null ? GetTags(ldRLoc) : new List<string>();
                            timeline.Add(new ItineraryTimelineItemDto("meal",
                                ldRLoc is not null ? $"Farewell lunch at {ldRLoc.Name}" : "Farewell lunch",
                                TimeOnly.FromDateTime(lunchStartTime), TimeOnly.FromDateTime(ldLunchEnd),
                                ldRLoc?.Id ?? 0, ldLunchTags,
                                toMoney(0), toMoney(ldMealExtraCost), toMoney(ldMealGroupCost), "Farewell lunch before departure",
                                ldRLoc is not null ? Math.Round((double)(ldRLoc.Score ?? 0), 2) : 0,
                                Alternatives: lastDayLunchAlts.Count > 0 ? lastDayLunchAlts : null));
                            totalMealCost += ldLunchBudgetDeduction > 0 ? ldMealGroupCost : 0m;
                            dayMealCost += ldLunchBudgetDeduction > 0 ? ldMealGroupCost : 0m;
                            remainingDayBudget -= ldLunchBudgetDeduction;
                            remainingMealBudget -= ldLunchBudgetDeduction;
                            currentTime = AddMinutes(ldLunchEnd, BufferAfterMeal);
                            lunchInserted = true;

                            if (ldRLoc is not null)
                            {
                                currentPoint = GeoPoint.FromLocation(ldRLoc);
                                currentLocationName = ldRLoc.Name;
                                currentLocationId = ldRLoc.Id;
                            }
                        }

                        // === Checkout ===
                        if (destAccommodation is not null)
                        {
                            // Local transport back to hotel for checkout (if not already at hotel)
                            var accomPoint = GeoPoint.FromLocation(destAccommodation);
                            if (currentLocationId != destAccommodation.Id)
                            {
                                var coTransport = await BuildLocalTransportAsync(
                                    currentPoint, accomPoint, groupSize, transportModes, toMoney, cancellationToken);
                                var coTransportArrival = AddMinutes(currentTime, coTransport.SelectedTravelTimeMinutes);

                                var coTransportLeg = new LocationToLocationTravelLegDto(
                                    currentLocationId, currentLocationName ?? "Unknown",
                                    destAccommodation.Id, destAccommodation.Name,
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(coTransportArrival),
                                    coTransport.DistanceKm, null,
                                    0, toMoney(0),
                                    coTransport.TransportOptions);
                                timeline.Add(new ItineraryTimelineItemDto("travel",
                                    $"Return to {destAccommodation.Name}",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(coTransportArrival),
                                    0, new List<string>(),
                                    null, null, null, "", 0,
                                    LocationToLocationTravel: coTransportLeg));

                                currentTime = coTransportArrival;
                                currentPoint = accomPoint;
                                currentLocationName = destAccommodation.Name;
                                currentLocationId = destAccommodation.Id;
                            }

                            var coStart = Max(currentTime, date.ToDateTime(new TimeOnly(12, 0)));
                            var coEnd = AddMinutes(coStart, 20);
                            var lastDayAlts = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                            var lastDayTagNames = GetTags(destAccommodation);
                            var lastDayCoPerPerson = GetPerPersonPrice(destAccommodation);
                            var lastDayCoGroupCost = lastDayCoPerPerson * groupSize;
                            timeline.Add(new ItineraryTimelineItemDto("check-out",
                                $"Check out from {destAccommodation.Name}",
                                TimeOnly.FromDateTime(coStart), TimeOnly.FromDateTime(coEnd),
                                destAccommodation.Id, lastDayTagNames,
                                toMoney(0), toMoney(lastDayCoPerPerson), toMoney(lastDayCoGroupCost), "Check out before departure",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                Alternatives: lastDayAlts is { Count: > 0 } ? lastDayAlts : null));
                            dayAccommodationCost += lastDayCoGroupCost;
                            currentTime = AddMinutes(coEnd, 10);
                            currentPoint = GeoPoint.FromLocation(destAccommodation);
                            currentLocationName = destAccommodation.Name;
                            currentLocationId = destAccommodation.Id;
                        }

                        // === Post-checkout activities: fill afternoon if return trip is short ===
                        // When user's home is close (same province or no transit hub), checkout at ~12:20
                        // would leave the whole afternoon empty. Add activities until a reasonable departure time.
                        if (destAccommodation is not null)
                        {
                            var isShortReturn = userProvinceId == currentProvince.Id || HasNoTransitHubSupport(returnTransport);
                            if (isShortReturn)
                            {
                                // Estimate return travel time to decide how much free time we have
                                var estReturnTransport = await BuildLocalTransportAsync(
                                    currentPoint, userGeo, groupSize, transportModes, toMoney, cancellationToken);
                                var estReturnMinutes = estReturnTransport.SelectedTravelTimeMinutes;
                                // Target: arrive home by ~17:00-18:00, so departure = 17:00 - travel time
                                var latestDepartureTime = date.ToDateTime(new TimeOnly(17, 0)).AddMinutes(-estReturnMinutes);
                                var postCheckoutEndTime = latestDepartureTime.AddMinutes(-30); // buffer before departure

                                if (postCheckoutEndTime > currentTime.AddHours(1)) // need at least 1h of free time
                                {
                                    while (currentTime < postCheckoutEndTime.AddHours(-1))
                                    {
                                        var pcAvailable = dayAttractions.Where(x => !visitedLocationIds.Contains(x.Location.Id)).ToList();
                                        if (pcAvailable.Count == 0) break;

                                        var pcNext = PickNextAttractionRandomized(
                                            pcAvailable, currentPoint, remainingDayBudget,
                                            currentTime, postCheckoutEndTime, groupSize, date.DayOfWeek, request.TripSegment,
                                            recentlyVisitedLocationIds, out _);
                                        if (pcNext is null) break;

                                        var pcNextPoint = GeoPoint.FromLocation(pcNext.Location);
                                        var pcLocalTransport = await BuildLocalTransportAsync(
                                            currentPoint, pcNextPoint, groupSize, transportModes, toMoney, cancellationToken);
                                        var pcArrival = AddMinutes(currentTime, pcLocalTransport.SelectedTravelTimeMinutes);
                                        var pcStay = pcNext.Location.RecommendedDurationMinutes ?? DefaultStayMinutes;
                                        var pcEnd = AddMinutes(pcArrival, pcStay);
                                        if (pcEnd > postCheckoutEndTime) break;

                                        if (!IsOpenAtTime(pcNext.Location, date.DayOfWeek, TimeOnly.FromDateTime(pcArrival)))
                                        {
                                            visitedLocationIds.Add(pcNext.Location.Id);
                                            continue;
                                        }

                                        var pcTicket = pcNext.Location.TicketPrice;
                                        var pcExtra = EstimateExtraSpending(pcNext.Location, request.TripSegment, groupSize);

                                        var pcLeg = new LocationToLocationTravelLegDto(
                                            currentLocationId, currentLocationName ?? "Unknown",
                                            pcNext.Location.Id, pcNext.Location.Name,
                                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(pcArrival),
                                            pcLocalTransport.DistanceKm, null, 0, toMoney(0),
                                            pcLocalTransport.TransportOptions);
                                        timeline.Add(new ItineraryTimelineItemDto("travel",
                                            "Local transfer",
                                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(pcArrival),
                                            0, new List<string>(), null, null, null, "", 0,
                                            LocationToLocationTravel: pcLeg));

                                        var pcEventType = (pcNext.Location.LocationTypeId == 5 ||
                                            (pcNext.Location.LocationType != null &&
                                             pcNext.Location.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                                            ? "shopping" : "visit";
                                        var pcTags = GetTags(pcNext.Location);
                                        timeline.Add(new ItineraryTimelineItemDto(pcEventType,
                                            pcEventType == "shopping" ? $"Shopping at {pcNext.Location.Name}" : $"Visit {pcNext.Location.Name}",
                                            TimeOnly.FromDateTime(pcArrival), TimeOnly.FromDateTime(pcEnd),
                                            pcNext.Location.Id, pcTags,
                                            toMoney(pcTicket), toMoney(pcExtra / groupSize),
                                            toMoney((pcTicket * groupSize) + pcExtra),
                                            $"Score: {pcNext.CompositeScore:F1}",
                                            Math.Round((double)(pcNext.Location.Score ?? 0), 2),
                                            pcNext.Location.Address, pcNext.Location.Telephone, GetMediaUrls(pcNext.Location)));

                                        dayTransportCost += pcLocalTransport.SelectedTotalCost;
                                        dayActivityCost += (pcTicket * groupSize) + pcExtra;
                                        remainingDayBudget -= (pcTicket * groupSize) + pcExtra + pcLocalTransport.SelectedTotalCost;
                                        visitedLocationIds.Add(pcNext.Location.Id);
                                        currentPoint = pcNextPoint;
                                        currentLocationName = pcNext.Location.Name;
                                        currentLocationId = pcNext.Location.Id;
                                        currentTime = AddMinutes(pcEnd, BufferAfterActivity);
                                    }
                                }
                            }
                        }

                        // Return transport: intercity (different province) or direct local (same province)
                        if (userProvinceId != currentProvince.Id && !HasNoTransitHubSupport(returnTransport))
                        {
                            var retRecOpt = GetRecommendedOption(returnTransport);

                            // Travel from current location to departure transit hub
                            {
                                var departureHubPoint = new GeoPoint("Hub", currentProvince.Latitude ?? 0, currentProvince.Longitude ?? 0);
                                var toHubTransport = await BuildLocalTransportAsync(
                                    currentPoint, departureHubPoint, groupSize, transportModes, toMoney, cancellationToken);
                                var toHubArrival = AddMinutes(currentTime, toHubTransport.SelectedTravelTimeMinutes);

                                var toHubLeg = new LocationToTransitHubTravelLegDto(
                                    0, currentLocationName ?? "Unknown", retRecOpt.FromTransitHubId, retRecOpt.FromTransitHubName ?? "",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(toHubArrival),
                                    toHubTransport.DistanceKm, null,
                                    0, toMoney(0),
                                    toHubTransport.TransportOptions);
                                timeline.Add(new ItineraryTimelineItemDto("travel",
                                    "Transfer to station / airport",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(toHubArrival),
                                    0, new List<string>(),
                                    null, null, null, "", 0,
                                    LocationToTransitHubTravel: toHubLeg));
                                dayTransportCost += toHubTransport.SelectedTotalCost;
                                currentTime = AddMinutes(toHubArrival, 10);
                            }

                            var returnDeparture = Max(currentTime, date.ToDateTime(new TimeOnly(17, 0)));
                            var returnArrival = AddMinutes(returnDeparture, retRecOpt.EstimatedTravelMinutes);

                            var returnLeg = new ProvinceToProvinceTravelLegDto(
                                returnTransport.FromProvinceId, returnTransport.FromProvinceName,
                                returnTransport.ToProvinceId, returnTransport.ToProvinceName,
                                TimeOnly.FromDateTime(returnDeparture), TimeOnly.FromDateTime(returnArrival),
                                returnTransport.DistanceKm, null,
                                0, toMoney(0),
                                returnTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Intercity transfer",
                                TimeOnly.FromDateTime(returnDeparture), TimeOnly.FromDateTime(returnArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                ProvinceToProvinceTravel: returnLeg));
                            dayTransportCost += retRecOpt.EstimatedTotalCost.BaseAmount;
                            currentTime = AddMinutes(returnArrival, BufferAfterIntercityArrival);

                            // Local transfer from arrival hub to user's location
                            {
                                var arrivalHub = transitHubs.FirstOrDefault(h => h.Id == retRecOpt.ToTransitHubId);
                                var hubPoint = arrivalHub is not null
                                    ? new GeoPoint("Arrival Hub", arrivalHub.Latitude, arrivalHub.Longitude)
                                    : userGeo; // fallback if hub not found

                                var fromHubTransport = await BuildLocalTransportAsync(
                                    hubPoint, userGeo, groupSize, transportModes, toMoney, cancellationToken);
                                var fromHubArrival = AddMinutes(currentTime, fromHubTransport.SelectedTravelTimeMinutes);

                                var fromHubLeg = new TransitHubToLocationTravelLegDto(
                                    retRecOpt.ToTransitHubId, retRecOpt.ToTransitHubName ?? "Arrival Station",
                                    0, "Your Location",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(fromHubArrival),
                                    fromHubTransport.DistanceKm, null,
                                    0, toMoney(0),
                                    fromHubTransport.TransportOptions);
                                timeline.Add(new ItineraryTimelineItemDto("travel",
                                    "Local transfer to your location",
                                    TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(fromHubArrival),
                                    0, new List<string>(),
                                    null, null, null, "", 0,
                                    TransitHubToLocationTravel: fromHubLeg));
                                dayTransportCost += fromHubTransport.SelectedTotalCost;
                            }
                        }
                        else
                        {
                            // Same province OR no transit hub support: direct local transport back to user's location
                            var directReturnTransport = await BuildLocalTransportAsync(
                                currentPoint, userGeo, groupSize, transportModes, toMoney, cancellationToken);
                            var directReturnArrival = AddMinutes(currentTime, directReturnTransport.SelectedTravelTimeMinutes);

                            var directReturnLeg = new LocationToLocationTravelLegDto(
                                currentLocationId, currentLocationName ?? "Unknown",
                                0, "Your Location",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directReturnArrival),
                                directReturnTransport.DistanceKm, null,
                                0, toMoney(0),
                                directReturnTransport.TransportOptions);
                            timeline.Add(new ItineraryTimelineItemDto("travel",
                                "Local transfer to your location",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(directReturnArrival),
                                0, new List<string>(),
                                null, null, null, "", 0,
                                LocationToLocationTravel: directReturnLeg));
                            dayTransportCost += directReturnTransport.SelectedTotalCost;
                        }
                    }

                    // === RULE 10: Fallback — ensure at least one non-transport activity per day ===
                    // If no visit/shopping/meal activities were added, try to add at least one
                    var hasMeaningfulActivity = timeline.Any(t => t.EventType is "visit" or "shopping" or "meal");
                    if (!hasMeaningfulActivity && dayAttractions.Count > 0)
                    {
                        // Gradually relax constraints: try to find any available attraction
                        var fallbackAttraction = dayAttractions
                            .Where(x => !visitedLocationIds.Contains(x.Location.Id))
                            .OrderBy(x => x.CompositeScore)
                            .FirstOrDefault();

                        if (fallbackAttraction is not null)
                        {
                            var fallbackPoint = GeoPoint.FromLocation(fallbackAttraction.Location);
                            var fallbackTransport = await BuildLocalTransportAsync(
                                currentPoint, fallbackPoint, groupSize, transportModes, toMoney, cancellationToken);
                            var fallbackArrival = AddMinutes(currentTime, fallbackTransport.SelectedTravelTimeMinutes);
                            var fallbackStay = fallbackAttraction.Location.RecommendedDurationMinutes ?? DefaultStayMinutes;
                            var fallbackEnd = AddMinutes(fallbackArrival, fallbackStay);

                            if (fallbackEnd <= dayEndTime)
                            {
                                var fallbackCost = (fallbackAttraction.Location.TicketPrice * groupSize) +
                                    EstimateExtraSpending(fallbackAttraction.Location, request.TripSegment, groupSize) +
                                    fallbackTransport.SelectedTotalCost;

                                if (fallbackCost <= remainingDayBudget)
                                {
                                    var fallbackLeg = new LocationToLocationTravelLegDto(
                                        currentLocationId, currentLocationName ?? "Unknown",
                                        fallbackAttraction.Location.Id, fallbackAttraction.Location.Name,
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(fallbackArrival),
                                        fallbackTransport.DistanceKm, null, 0, toMoney(0),
                                        fallbackTransport.TransportOptions);
                                    timeline.Add(new ItineraryTimelineItemDto("travel",
                                        "Local transfer",
                                        TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(fallbackArrival),
                                        0, new List<string>(), null, null, null, "", 0,
                                        LocationToLocationTravel: fallbackLeg));

                                    var fallbackTags = GetTags(fallbackAttraction.Location);
                                    var fallbackEventType = (fallbackAttraction.Location.LocationTypeId == 5 ||
                                        (fallbackAttraction.Location.LocationType != null &&
                                         fallbackAttraction.Location.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase)))
                                        ? "shopping" : "visit";
                                    var fallbackExtraPerPerson = EstimateExtraSpending(fallbackAttraction.Location, request.TripSegment, groupSize) / groupSize;

                                    timeline.Add(new ItineraryTimelineItemDto(fallbackEventType,
                                        fallbackEventType == "shopping" ? $"Shopping at {fallbackAttraction.Location.Name}" : $"Visit {fallbackAttraction.Location.Name}",
                                        TimeOnly.FromDateTime(fallbackArrival), TimeOnly.FromDateTime(fallbackEnd),
                                        fallbackAttraction.Location.Id, fallbackTags,
                                        toMoney(fallbackAttraction.Location.TicketPrice), toMoney(fallbackExtraPerPerson),
                                        toMoney(fallbackCost), $"Recommended visit (score: {fallbackAttraction.CompositeScore:F1})",
                                        Math.Round((double)(fallbackAttraction.Location.Score ?? 0), 2),
                                        fallbackAttraction.Location.Address, fallbackAttraction.Location.Telephone, GetMediaUrls(fallbackAttraction.Location)));

                                    dayTransportCost += fallbackTransport.SelectedTotalCost;
                                    dayActivityCost += fallbackCost - fallbackTransport.SelectedTotalCost;
                                    remainingDayBudget -= fallbackCost;
                                    visitedLocationIds.Add(fallbackAttraction.Location.Id);
                                    currentPoint = fallbackPoint;
                                    currentLocationName = fallbackAttraction.Location.Name;
                                    currentLocationId = fallbackAttraction.Location.Id;
                                    currentTime = AddMinutes(fallbackEnd, BufferAfterActivity);
                                }
                            }
                        }
                    }

                    // Day summary
                    var daySpent = dayTransportCost + dayAccommodationCost + dayActivityCost + dayMealCost;
                    var budgetLeftover = Math.Max(0, limit - dayActivityCost);
                    var nextDayWeight = dayWeights.GetValueOrDefault(dayNumber + 1, 1.0);
                    var nextDayBase = activityBudget * (decimal)nextDayWeight / (decimal)totalWeight;
                    var nextDayLimit = nextDayBase * 1.3m;
                    rolloverBudget = Math.Min(budgetLeftover, nextDayLimit * 0.5m);

                    // Last day: do NOT dump remaining budget to avoid overshoot
                    // The remaining budget is saved as contingency for the user

                    totalTransportCost += dayTransportCost;
                    totalAccommodationCost += dayAccommodationCost;
                    totalActivityCost += dayActivityCost;
                    // Note: totalMealCost is already accumulated per-meal inside the day loop

                    var weatherSummary = weather is not null
                        ? $"{currentProvince.EnglishName}: {weather.Summary}" : null;

                    // Generate day title based on cross-province travel
                    string dayTitle;
                    if (globalDayIndex == 0 && userProvinceId != currentProvince.Id)
                    {
                        // Day 1: cross-province from user's province to first destination
                        dayTitle = $"Day {dayNumber}: {userProvinceName} - {currentProvince.EnglishName}";
                    }
                    else if (localDay == 0 && destIdx > 0)
                    {
                        // First day at new destination: cross-province
                        var prevProvince = orderedDestinations[destIdx - 1];
                        dayTitle = $"Day {dayNumber}: {prevProvince.EnglishName} - {currentProvince.EnglishName}";
                    }
                    else if (globalDayIndex == totalDays - 1 && userProvinceId != currentProvince.Id)
                    {
                        // Last day: return to user's province
                        dayTitle = $"Day {dayNumber}: {currentProvince.EnglishName} - {userProvinceName}";
                    }
                    else
                    {
                        // Same province
                        dayTitle = $"Day {dayNumber} - {currentProvince.EnglishName}";
                    }

                    // Save last location for next day's starting point (no-hotel trips)
                    prevDayLastPoint = currentPoint;
                    prevDayLastLocationName = currentLocationName;
                    prevDayLastLocationId = currentLocationId;

                    days.Add(new ItineraryDayDto(dayNumber, dayTitle, date,
                        currentProvince.Id, weatherSummary,
                        toMoney(daySpent),
                        timeline));

                    globalDayIndex++;
                }
            }

            // Post-process: Re-filter alternatives against ALL main locations in the ENTIRE trip
            // This ensures alternatives don't include ANY location that appears as a main item
            // across ALL days (not just the current day)
            var allMainLocationIdsInTrip = days
                .SelectMany(d => d.Timeline)
                .Where(t => t.EventType is "visit" or "shopping" or "meal" or "check-in" or "check-out" or "hotel-return")
                .Select(t => t.LocationId)
                .Where(id => id > 0)
                .ToHashSet();
            days = ReFilterAllDaysAlternatives(days, allMainLocationIdsInTrip);

            // STAGE 7: Budget Validation & Output Assembly
            var estimatedTotal = totalTransportCost + totalAccommodationCost + totalMealCost + totalActivityCost;

            // Remaining budget must be >= 0 (cannot exceed usable budget)
            if (estimatedTotal > usableBudget)
            {
                var deficit = estimatedTotal - usableBudget;
                var suggestions = new List<string>
                {
                    $"Estimated cost ({estimatedTotal:N0} VND) exceeds usable budget ({usableBudget:N0} VND) by {deficit:N0} VND.",
                    "Suggestions: increase your budget, reduce the number of destinations/days, choose cheaper accommodations, or remove expensive locations."
                };
                
                if (attempt < maxAttempts)
                {
                    notes.Add($"Attempt {attempt} failed due to budget overrun of {deficit:N0} VND. Retrying...");
                    continue;
                }
                
                return Error.Validation(
                    "Itinerary.BudgetInsufficient",
                    string.Join(" ", suggestions));
            }

            var remainingBudget = Math.Max(0m, usableBudget - estimatedTotal);

            var budgetSummary = new BudgetSummaryDto(
                toMoney(request.TotalBudget),
                toMoney(contingencyFund),
                toMoney(usableBudget),
                toMoney(totalTransportCost),
                toMoney(totalAccommodationCost),
                toMoney(totalMealCost),
                toMoney(totalActivityCost),
                toMoney(estimatedTotal),
                toMoney(remainingBudget));

            notes.Add(request.IsContingencyNeeded 
                ? $"Contingency fund: {contingencyFund:N0} VND ({contingencyPercent * 100:F0}%)."
                : "No contingency fund needed.");
            notes.Add($"Usable budget: {usableBudget:N0} VND.");

 

            return new GeneratedItineraryDto(
                request.UserLocation,
                request.Destinations,
                request.StartDate, request.EndDate,
                groupSize,
                resolvedCurrency,
                isLuxuryTrip ? "Luxury" : ClassifyBudgetLevel(request.TotalBudget, groupSize, totalDays),
                budgetSummary,
                days, new List<string>());
            } // END RETRY LOOP
            
            return Error.Unexpected("Itinerary.GenerationFailed", "Itinerary generation failed unpredictably.");
        }

        // === WEATHER-BASED SCORING ===

        private static List<ScoredLocation> ApplyWeatherScoring(IList<ScoredLocation> attractions, bool isBadWeather)
        {
            if (!isBadWeather) return attractions.ToList();

            return attractions.Select(sl =>
            {
                bool isIndoor = sl.Location.Tags.Any(t =>
                    IndoorTagKeywords.Any(kw => t.Name.Contains(kw, StringComparison.OrdinalIgnoreCase)));
                bool isOutdoor = sl.Location.Tags.Any(t =>
                    OutdoorTagKeywords.Any(kw => t.Name.Contains(kw, StringComparison.OrdinalIgnoreCase)));

                double multiplier = 1.0;
                if (isOutdoor && !isIndoor) multiplier = 0.5;
                else if (isIndoor && !isOutdoor) multiplier = 1.5;

                return new ScoredLocation(sl.Location, sl.CompositeScore * multiplier);
            })
            .OrderByDescending(x => x.CompositeScore)
            .ToList();
        }

        // === TAG MATCHING (ID-BASED) ===

        private static double ComputeCompositeScore(Location location, HashSet<int> favoriteTagIds)
        {
            var quality = CalculateQualityScore(location, favoriteTagIds);
            var stayMinutes = Math.Clamp(
                location.RecommendedDurationMinutes ?? DefaultStayMinutes, MinStayMinutes, 240);
            var timeEfficiency = Math.Max(0, 100 - (stayMinutes - 30) / 3.0);
            var costEfficiency = Math.Max(0, 100 - (double)GetPerPersonPrice(location) / 5000.0);

            return quality * 0.40 + timeEfficiency * 0.35 + costEfficiency * 0.25;
        }

        private static double CalculateQualityScore(Location location, HashSet<int> favoriteTagIds)
        {
            double baseQuality = NormalizeScore(location.Score);
            if (favoriteTagIds.Count == 0) return baseQuality;
            int matchCount = location.Tags.Count(t => favoriteTagIds.Contains(t.Id));
            return Math.Min(100, baseQuality + matchCount * 10);
        }

        // === RANDOMIZED ACTIVITY PICKER (TOP-3) ===

        private static ScoredLocation? PickNextAttractionRandomized(
            IList<ScoredLocation> candidates, GeoPoint currentPoint,
            decimal remainingBudget, DateTime currentTime, DateTime dayEndTime,
            int groupSize, DayOfWeek dayOfWeek, string tripSegment,
            HashSet<int> recentlyVisitedLocationIds,
            out List<ScoredLocation> topAlternatives)
        {
            var feasible = new List<(ScoredLocation Location, double DynamicScore, bool IsRecentlyVisited)>();

            // Calculate per-person budget to determine if we should prioritize cheap options
            var budgetPerPerson = remainingBudget / Math.Max(groupSize, 1);
            bool isBudgetTight = budgetPerPerson < 200_000m; // Tight if less than 200k per person

            foreach (var candidate in candidates)
            {
                var loc = candidate.Location;
                double distanceKm = HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude, loc.Latitude, loc.Longitude);
                if (double.IsInfinity(distanceKm) || double.IsNaN(distanceKm) || distanceKm > 10_000) continue;
                double travelMinutes = (distanceKm / DefaultSpeedKmh) * 60.0;
                var arrivalTime = currentTime.AddMinutes(travelMinutes);

                int stayDuration = loc.RecommendedDurationMinutes ?? DefaultStayMinutes;
                var endTime = arrivalTime.AddMinutes(stayDuration);
                if (endTime > dayEndTime) continue;
                if (!IsOpenAtTime(loc, dayOfWeek, TimeOnly.FromDateTime(arrivalTime))) continue;

                decimal ticketPerPerson = loc.TicketPrice;
                decimal transportEstimate = (decimal)(distanceKm * 8_000) * (int)Math.Ceiling(groupSize / 4.0);
                decimal totalCost = (ticketPerPerson * groupSize) + transportEstimate;

                // When budget is exhausted, still allow candidates through
                // (the caller decides whether to add them with zero budget deduction)
                bool overBudget = totalCost > remainingBudget && remainingBudget > 0;
                if (overBudget) continue;

                bool isRecentlyVisited = recentlyVisitedLocationIds.Contains(loc.Id);

                double baseScore = candidate.CompositeScore;
                double distanceScore = Math.Max(0, 100 - distanceKm * 10);
                double remainingMinutes = (dayEndTime - currentTime).TotalMinutes;
                double timeNeeded = travelMinutes + stayDuration;
                double timeEfficiency = Math.Max(0, 100 - (timeNeeded / Math.Max(1, remainingMinutes) * 100));

                // When budget is tight, factor in price efficiency (cheaper = higher score)
                double dynamicScore;
                if (isBudgetTight && totalCost > 0)
                {
                    double priceEfficiency = Math.Max(0, 100 - (double)(totalCost / Math.Max(remainingBudget, 1) * 100));
                    dynamicScore = baseScore * 0.3 + distanceScore * 0.2 + timeEfficiency * 0.2 + priceEfficiency * 0.3;
                }
                else
                {
                    dynamicScore = baseScore * 0.4 + distanceScore * 0.3 + timeEfficiency * 0.3;
                }

                // Apply penalty for recently visited locations
                if (isRecentlyVisited)
                {
                    dynamicScore *= 0.5; // 50% penalty
                }

                feasible.Add((candidate, dynamicScore, isRecentlyVisited));
            }

            if (feasible.Count == 0)
            {
                topAlternatives = new List<ScoredLocation>();
                return null;
            }

            // Hard exclude: if enough new options exist, remove recently visited ones completely
            var newOptions = feasible.Where(x => !x.IsRecentlyVisited).ToList();
            var pool = newOptions.Count >= 3 ? newOptions : feasible;

            var topCandidates = pool.OrderByDescending(x => x.DynamicScore).Take(4).ToList();
            topAlternatives = topCandidates.Select(x => x.Location).ToList();
            return topCandidates[Random.Shared.Next(Math.Min(topCandidates.Count, 3))].Location;
        }

        // === MEAL / RESTAURANT PICKER ===

        private static ScoredLocation? PickRestaurantNearby(
            IList<ScoredLocation> attractions, GeoPoint currentPoint, HashSet<int> visitedIds,
            HashSet<int> visitedRestaurantIds, decimal maxAffordablePerPerson, int groupSize, string tripSegment,
            out List<AlternativeLocationDto> alternativeRestaurants, Func<decimal, MoneyDto> toMoney,
            HashSet<int> recentlyVisitedLocationIds, HashSet<int> favoriteTagIds)
        {
            // Define price bounds per person based on trip segment for restaurant matching
            var (minPricePerPerson, maxPricePerPerson) = tripSegment switch
            {
                "Budget" => (0m, 150_000m),
                "Luxury" => (1_000_000m, decimal.MaxValue),
                _ => (300_000m, 600_000m) // Standard
            };

            var restaurants = attractions
                .Where(x => !visitedIds.Contains(x.Location.Id) && !visitedRestaurantIds.Contains(x.Location.Id))
                .Where(x => x.Location.LocationTypeId == 2 ||
                    (x.Location.LocationType != null && (
                        x.Location.LocationType.Name.Contains("Restaurant", StringComparison.OrdinalIgnoreCase) ||
                        x.Location.LocationType.Name.Contains("Food", StringComparison.OrdinalIgnoreCase) ||
                        x.Location.LocationType.Name.Contains("Cafe", StringComparison.OrdinalIgnoreCase))))
                // Filter by budget: restaurant price must be within remaining budget
                .Where(x =>
                {
                    var pricePerPerson = GetPerPersonPrice(x.Location);
                    return pricePerPerson <= maxAffordablePerPerson && pricePerPerson >= 0;
                })
                // Filter by trip segment price range (relaxed if no restaurants match)
                .ToList();

            // If no restaurants match segment + budget, relax segment filter but keep budget filter
            if (restaurants.Count == 0)
            {
                restaurants = attractions
                    .Where(x => !visitedIds.Contains(x.Location.Id) && !visitedRestaurantIds.Contains(x.Location.Id))
                    .Where(x => x.Location.LocationTypeId == 2 ||
                        (x.Location.LocationType != null && (
                            x.Location.LocationType.Name.Contains("Restaurant", StringComparison.OrdinalIgnoreCase) ||
                            x.Location.LocationType.Name.Contains("Food", StringComparison.OrdinalIgnoreCase) ||
                            x.Location.LocationType.Name.Contains("Cafe", StringComparison.OrdinalIgnoreCase))))
                    .Where(x =>
                    {
                        var pricePerPerson = GetPerPersonPrice(x.Location);
                        return pricePerPerson <= maxAffordablePerPerson && pricePerPerson >= 0;
                    })
                    .ToList();
            }

            // If still no affordable restaurants, pick cheapest available (don't skip meals entirely)
            if (restaurants.Count == 0)
            {
                restaurants = attractions
                    .Where(x => !visitedIds.Contains(x.Location.Id) && !visitedRestaurantIds.Contains(x.Location.Id))
                    .Where(x => x.Location.LocationTypeId == 2 ||
                        (x.Location.LocationType != null && (
                            x.Location.LocationType.Name.Contains("Restaurant", StringComparison.OrdinalIgnoreCase) ||
                            x.Location.LocationType.Name.Contains("Food", StringComparison.OrdinalIgnoreCase) ||
                            x.Location.LocationType.Name.Contains("Cafe", StringComparison.OrdinalIgnoreCase))))
                    .OrderBy(x => GetPerPersonPrice(x.Location))
                    .Take(5)
                    .ToList();
            }

            if (restaurants.Count == 0)
            {
                alternativeRestaurants = new List<AlternativeLocationDto>();
                return null;
            }

            // When budget is very tight (< 100k per person), prioritize cheapest options
            bool isBudgetVeryTight = maxAffordablePerPerson < 100_000m;

            // Score by combining distance (closer is better) and composite score (higher is better)
            // Use weighted ratio: 30% score, 50% proximity, 20% tag match
            var scoredRestaurants = restaurants
                .Select(x =>
                {
                    var dist = HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude,
                        x.Location.Latitude, x.Location.Longitude);
                    var travelMin = (int)Math.Ceiling((dist / DefaultSpeedKmh) * 60.0);
                    // Normalize: lower distance = higher proximity score (max 10)
                    var proximityScore = Math.Max(0.0, 10.0 - dist);

                    // Tag match bonus: restaurants matching user's favorite tags get a significant boost
                    double tagMatchScore = 0.0;
                    if (favoriteTagIds.Count > 0)
                    {
                        int tagMatches = x.Location.Tags.Count(t => favoriteTagIds.Contains(t.Id));
                        tagMatchScore = Math.Min(10.0, tagMatches * 5.0); // max 10, 5 points per matching tag
                    }

                    // Composite score is already 0-10 scale
                    var combinedScore = favoriteTagIds.Count > 0
                        ? (x.CompositeScore * 0.30) + (proximityScore * 0.50) + (tagMatchScore * 0.20)
                        : (x.CompositeScore * 0.40) + (proximityScore * 0.60);

                    // When budget is very tight, factor in price (cheaper = better)
                    if (isBudgetVeryTight)
                    {
                        var pricePerPerson = GetPerPersonPrice(x.Location);
                        double priceScore = maxAffordablePerPerson > 0
                            ? Math.Max(0, 1.0 - (double)(pricePerPerson / maxAffordablePerPerson)) * 10
                            : 0;
                        combinedScore = combinedScore * 0.5 + priceScore * 0.5;
                    }

                    // Apply penalty for recently visited locations
                    bool isRecentlyVisited = recentlyVisitedLocationIds.Contains(x.Location.Id);
                    if (isRecentlyVisited)
                    {
                        combinedScore *= 0.5; // 50% penalty
                    }

                    return new { Scored = x, Distance = dist, TravelMin = travelMin, CombinedScore = combinedScore, IsRecentlyVisited = isRecentlyVisited };
                })
                .OrderByDescending(x => x.CombinedScore)
                .Take(5)
                .ToList();

            // Hard exclude: if enough new options exist, remove recently visited ones completely
            var newRestaurantOptions = scoredRestaurants.Where(x => !x.IsRecentlyVisited).ToList();
            var restaurantPool = newRestaurantOptions.Count >= 2 ? newRestaurantOptions : scoredRestaurants;

            // Pick randomly from top candidates to add variety
            var picked = restaurantPool[Random.Shared.Next(Math.Min(restaurantPool.Count, 3))];
            visitedRestaurantIds.Add(picked.Scored.Location.Id);

            alternativeRestaurants = scoredRestaurants
                .Where(r => r.Scored.Location.Id != picked.Scored.Location.Id)
                .Where(r => !visitedRestaurantIds.Contains(r.Scored.Location.Id))
                .Take(3)
                .Select(r =>
                {
                    var pricePerPerson = GetPerPersonPrice(r.Scored.Location);
                    var costForGroup = pricePerPerson * groupSize;
                    var tagNames = GetTags(r.Scored.Location);
                    return new AlternativeLocationDto(
                        r.Scored.Location.Id, r.Scored.Location.Name, tagNames,
                        toMoney(0), toMoney(pricePerPerson),
                        toMoney(costForGroup),
                        (double)r.Scored.Location.Score!,
                        Math.Round(r.Distance, 2), r.TravelMin,
                        r.Scored.Location.Address, r.Scored.Location.Telephone, GetMediaUrls(r.Scored.Location));
                }).ToList();

            return picked.Scored;
        }

        // === DESTINATION ORDERING ===

        private static List<Province> OrderDestinationsByAttractionDensity(
            List<Province> destinations, Dictionary<int, List<Location>> attractionsByProvince, GeoPoint startPoint)
        {
            var ordered = new List<Province>();
            var remaining = new HashSet<Province>(destinations);
            double currentLat = startPoint.Latitude;
            double currentLon = startPoint.Longitude;

            while (remaining.Count > 0)
            {
                Province? nextDest = null;
                double bestScore = -1;

                foreach (var dest in remaining)
                {
                    var attrs = attractionsByProvince.GetValueOrDefault(dest.Id);
                    if (attrs is null || attrs.Count == 0) continue;

                    var centerLat = attrs.Select(a => a.Latitude).DefaultIfEmpty(dest.Latitude ?? 0).Average();
                    var centerLon = attrs.Select(a => a.Longitude).DefaultIfEmpty(dest.Longitude ?? 0).Average();
                    var distance = HaversineKm(currentLat, currentLon, centerLat, centerLon);
                    var score = attrs.Count / (distance + 0.1);

                    if (score > bestScore) { bestScore = score; nextDest = dest; }
                }

                if (nextDest is null) break;
                ordered.Add(nextDest);
                remaining.Remove(nextDest);
                currentLat = nextDest.Latitude ?? 0;
                currentLon = nextDest.Longitude ?? 0;
            }

            ordered.AddRange(remaining);
            return ordered;
        }

        private static Dictionary<int, int> AllocateDaysToDestinations(
            List<Province> orderedDestinations, Dictionary<int, List<Location>> attractionsByProvince, int totalDays)
        {
            var result = new Dictionary<int, int>();
            foreach (var dest in orderedDestinations) result[dest.Id] = 1;

            int extraDays = totalDays - orderedDestinations.Count;
            if (extraDays <= 0) return result;

            var weights = new Dictionary<int, double>();
            double tw = 0;
            foreach (var dest in orderedDestinations)
            {
                double weight = Math.Sqrt(Math.Max(1, attractionsByProvince.GetValueOrDefault(dest.Id)?.Count ?? 0));
                weights[dest.Id] = weight;
                tw += weight;
            }

            var remainders = new Dictionary<int, double>();
            int allocated = 0;
            foreach (var dest in orderedDestinations)
            {
                double share = (weights[dest.Id] / tw) * extraDays;
                int wholeDays = (int)Math.Floor(share);
                result[dest.Id] += wholeDays;
                allocated += wholeDays;
                remainders[dest.Id] = share - wholeDays;
            }

            int stillToDistribute = extraDays - allocated;
            var sorted = remainders.OrderByDescending(r => r.Value).Select(r => r.Key).ToList();
            for (int i = 0; i < stillToDistribute && i < sorted.Count; i++) result[sorted[i]] += 1;

            return result;
        }

        // === BUDGET MANAGEMENT ===

        private static decimal CalculateContingencyPercentage(decimal totalBudget)
        {
            if (totalBudget < 5_000_000m) return 0.20m;
            if (totalBudget < 10_000_000m) return 0.15m;
            if (totalBudget < 20_000_000m) return 0.10m;
            if (totalBudget < 50_000_000m) return 0.08m;
            return 0.05m;
        }

        private static Dictionary<int, double> CalculateDayWeights(int totalDays)
        {
            var weights = new Dictionary<int, double>();
            for (int day = 1; day <= totalDays; day++)
            {
                double w = day switch { 1 => 1.3, 2 => 1.1, _ => 1.0 };
                if (day == totalDays && totalDays > 2) w = 1.2;
                weights[day] = w;
            }
            return weights;
        }

        private static (decimal floor, decimal limit) CalculateBudgetBounds(decimal weightedBudget)
            => (weightedBudget * 0.7m, weightedBudget * 1.3m);

        /// <summary>
        /// Classifies the budget level based on daily per-person spending (VND).
        /// Budget:   350,000 – 650,000 (Accommodation 150–300K + Restaurant 100–150K + Activity 100–200K)
        /// Standard: 1,300,000 – 2,600,000 (Accommodation 600K–1.2M + Restaurant 300–600K + Activity 400–800K)
        /// Luxury:   5,000,000+ (Accommodation 2.5–5M + Restaurant 1–3M + Activity 1.5–3M)
        /// </summary>
        private static string ClassifyBudgetLevel(decimal totalBudgetVnd, int groupSize, int totalDays)
        {
            var dailyPerPerson = totalBudgetVnd / Math.Max(groupSize, 1) / Math.Max(totalDays, 1);

            return dailyPerPerson switch
            {
                >= 5_000_000m => "Luxury",
                >= 1_300_000m => "Standard",
                _ => "Budget"
            };
        }

        // === POST-PROCESSING: Re-filter alternatives against ALL main locations in the entire trip ===
        // Also de-duplicates restaurant alternatives across all meals

        private static List<ItineraryDayDto> ReFilterAllDaysAlternatives(
            List<ItineraryDayDto> days, HashSet<int> allMainLocationIdsInTrip)
        {
            var result = new List<ItineraryDayDto>(days.Count);

            // Phase 1: Filter alternatives against main locations, collect meal alt IDs
            var usedRestaurantAltIds = new HashSet<int>();
            var phase1Timeline = new List<List<ItineraryTimelineItemDto>>();

            foreach (var day in days)
            {
                var filteredTimeline = new List<ItineraryTimelineItemDto>(day.Timeline.Count);

#pragma warning disable CS0219 // Variable is assigned but never used
                bool _anyChanged = false;
#pragma warning restore CS0219

                foreach (var item in day.Timeline)
                {
                    IList<AlternativeLocationDto>? filteredAlternatives = null;
                    IList<AccommodationRecommendationDto>? filteredAccomRecs = null;

                    // Filter AlternativeLocationDto: exclude any location that is a main location ANYWHERE in the trip
                    if (item.Alternatives is { Count: > 0 })
                    {
                        filteredAlternatives = item.Alternatives
                            .Where(a => !allMainLocationIdsInTrip.Contains(a.LocationId))
                            .ToList();
                        if (filteredAlternatives.Count == 0) filteredAlternatives = null;

                        // For meal alternatives, track IDs for cross-meal deduplication
                        if (item.EventType == "meal" && filteredAlternatives is { Count: > 0 })
                        {
                            foreach (var alt in filteredAlternatives)
                            {
                                usedRestaurantAltIds.Add(alt.LocationId);
                            }
                        }
                    }

                    // Filter AccommodationRecommendationDto: exclude any hotel that is a main location ANYWHERE in the trip
                    if (item.AccommodationRecommendations is { Count: > 0 })
                    {
                        filteredAccomRecs = item.AccommodationRecommendations
                            .Where(r => !allMainLocationIdsInTrip.Contains(r.LocationId))
                            .ToList();
                        if (filteredAccomRecs.Count == 0) filteredAccomRecs = null;
                    }

                    if (filteredAlternatives != item.Alternatives || filteredAccomRecs != item.AccommodationRecommendations)
                    {
                        _anyChanged = true;
                        filteredTimeline.Add(new ItineraryTimelineItemDto(
                            item.EventType, item.Title, item.StartTime, item.EndTime,
                            item.LocationId, item.TagNames,
                            item.TicketCost, item.ExtraCostPerPerson, item.CostForGroup,
                            item.Note, item.Score,
                            item.Address, item.Telephone, item.MediaUrls,
                            item.LocationToLocationTravel,
                            item.TransitHubToLocationTravel,
                            item.LocationToTransitHubTravel,
                            item.ProvinceToProvinceTravel,
                            filteredAlternatives,
                            filteredAccomRecs));
                    }
                    else
                    {
                        filteredTimeline.Add(item);
                    }
                }

                phase1Timeline.Add(filteredTimeline);
            }

            // Phase 2: De-duplicate restaurant alternatives across all meals
            // If a restaurant appears as alternative in multiple meals, keep it only in the first meal
            // Also exclude restaurants that are main meals themselves
            var seenRestaurantAltIds = new HashSet<int>(allMainLocationIdsInTrip); // Include main meal restaurants
            var seenAccomAltIds = new HashSet<int>(allMainLocationIdsInTrip); // Include main accommodations
            var phase2Timeline = new List<List<ItineraryTimelineItemDto>>();

            foreach (var timeline in phase1Timeline)
            {
                var dedupedTimeline = new List<ItineraryTimelineItemDto>(timeline.Count);

#pragma warning disable CS0219 // Variable is assigned but never used
                bool _anyChanged2 = false;
#pragma warning restore CS0219

                foreach (var item in timeline)
                {
                    IList<AlternativeLocationDto>? dedupedAlternatives = item.Alternatives;
                    IList<AccommodationRecommendationDto>? dedupedAccomRecs = item.AccommodationRecommendations;

                    // For meal alternatives, remove any restaurant already used in a previous meal
                    if (item.EventType == "meal" && item.Alternatives is { Count: > 0 })
                    {
                        var newAlts = item.Alternatives
                            .Where(a => !seenRestaurantAltIds.Contains(a.LocationId))
                            .ToList();

                        // Mark these IDs as seen for subsequent meals
                        foreach (var alt in newAlts)
                        {
                            seenRestaurantAltIds.Add(alt.LocationId);
                        }

                        if (newAlts.Count != item.Alternatives.Count)
                        {
                            _anyChanged2 = true;
                            dedupedAlternatives = newAlts.Count > 0 ? newAlts : null;
                        }
                    }

                    if (dedupedAlternatives != item.Alternatives)
                    {
                        _anyChanged2 = true;
                        dedupedTimeline.Add(new ItineraryTimelineItemDto(
                            item.EventType, item.Title, item.StartTime, item.EndTime,
                            item.LocationId, item.TagNames,
                            item.TicketCost, item.ExtraCostPerPerson, item.CostForGroup,
                            item.Note, item.Score,
                            item.Address, item.Telephone, item.MediaUrls,
                            item.LocationToLocationTravel,
                            item.TransitHubToLocationTravel,
                            item.LocationToTransitHubTravel,
                            item.ProvinceToProvinceTravel,
                            dedupedAlternatives,
                            dedupedAccomRecs));
                    }
                    else
                    {
                        dedupedTimeline.Add(item);
                    }
                }

                phase2Timeline.Add(dedupedTimeline);
            }

            // Build final result
            for (int i = 0; i < days.Count; i++)
            {
                var day = days[i];
                var finalTimeline = phase2Timeline[i];

                // Check if anything changed from original
                bool anyChanged = finalTimeline.Count != day.Timeline.Count ||
                    finalTimeline.Where((t, idx) => !ReferenceEquals(t, day.Timeline[idx])).Any();

                if (anyChanged)
                {
                    result.Add(new ItineraryDayDto(
                        day.DayNumber, day.DayTitle, day.Date,
                        day.ProvinceId, day.WeatherSummary,
                        day.EstimatedCost,
                        finalTimeline));
                }
                else
                {
                    result.Add(day);
                }
            }

            return result;
        }

        private static decimal EstimateExtraSpending(Location location, string tripSegment, int groupSize)
        {
            decimal min = location.PriceMinUsd ?? 0;
            decimal max = location.PriceMaxUsd ?? 0;

            if (min <= 0 && max <= 0)
            {
                (min, max) = tripSegment switch
                {
                    "Budget" => (5_000m, 20_000m),
                    "Luxury" => (20_000m, 80_000m),
                    _ => (10_000m, 50_000m)
                };
            }

            decimal avg = (min + max) / 2m;
            bool isSpendingCategory = location.LocationTypeId == 2 || // Restaurant
                location.LocationTypeId == 5 || // Shopping
                (location.LocationType != null && (
                    location.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase) ||
                    location.LocationType.Name.Contains("Food", StringComparison.OrdinalIgnoreCase) ||
                    location.LocationType.Name.Contains("Market", StringComparison.OrdinalIgnoreCase) ||
                    location.LocationType.Name.Contains("Restaurant", StringComparison.OrdinalIgnoreCase)));

            return Math.Round(avg * (isSpendingCategory ? 1.2m : 1.0m) * groupSize, 0);
        }

        // === ACCOMMODATION (Only when HotelPreference set) ===

        private static (Location? best, List<AccommodationRecommendationDto> recommendations)
            SelectAndScoreAccommodation(
                IList<Location> hotels, IList<ScoredLocation> attractions,
                int groupSize, decimal dailyBudget, string hotelPreference,
                Province province, Func<decimal, MoneyDto> toMoney, decimal maxPerPersonPerNight,
                HashSet<int> recentlyVisitedLocationIds, HashSet<int> favoriteTagIds)
        {
            if (hotels.Count == 0) return (null, new List<AccommodationRecommendationDto>());

            if (dailyBudget / Math.Max(groupSize, 1) >= 5_000_000m) hotelPreference = "Luxury";

            if (hotelPreference == "Luxury" && maxPerPersonPerNight < 2_000_000m)
            {
                hotelPreference = "Standard";
            }

            var (minPrice, maxPrice) = hotelPreference switch
            {
                "Budget" => (0m, 500_000m),
                "Luxury" => (2_000_000m, decimal.MaxValue),
                _ => (500_000m, 2_000_000m)
            };

            maxPrice = Math.Min(maxPrice, Math.Max(minPrice + 100_000m, maxPerPersonPerNight));

            var filtered = hotels.Where(h => { var avg = GetPerPersonPrice(h); return avg >= minPrice && avg <= maxPrice; }).ToList();
            if (filtered.Count == 0)
            {
                // If no hotels match the price range, expand the range gradually
                // First try expanding maxPrice up to 2x the original cap
                var expandedMaxPrice = maxPerPersonPerNight * 2m;
                filtered = hotels.Where(h => { var avg = GetPerPersonPrice(h); return avg >= minPrice && avg <= expandedMaxPrice; }).ToList();
                
                // If still no match, just pick the cheapest hotels within reason
                if (filtered.Count == 0)
                {
                    filtered = hotels.OrderBy(h => GetPerPersonPrice(h))
                                     .Take(Math.Max(1, hotels.Count / 3))
                                     .ToList();
                }
            }

            var topAttractions = attractions.Take(5).ToList();
            double centerLat = topAttractions.Count > 0
                ? topAttractions.Select(a => a.Location.Latitude).DefaultIfEmpty(province.Latitude ?? 0).Average()
                : (province.Latitude ?? 0);
            double centerLon = topAttractions.Count > 0
                ? topAttractions.Select(a => a.Location.Longitude).DefaultIfEmpty(province.Longitude ?? 0).Average()
                : (province.Longitude ?? 0);

            var scored = filtered.Select(hotel =>
            {
                double dist = HaversineKmOrMax(hotel.Latitude, hotel.Longitude, centerLat, centerLon);
                double distanceScore = Math.Max(0, 100 - dist * 15);
                decimal avgPrice = GetPerPersonPrice(hotel);
                double budgetScore = 50;
                if (dailyBudget > 0)
                {
                    budgetScore = hotelPreference == "Luxury"
                        ? Math.Min(100, (double)(avgPrice / dailyBudget * 100))
                        : Math.Max(0, 100 - (double)(avgPrice / dailyBudget * 100));
                }
                double groupScore = hotel.LocationAmenities.Count > 0 ? 70 : 50;
                double amenitiesScore = Math.Min(100, hotel.LocationAmenities.Count * 15);

                // Tag match bonus: hotels matching user's favorite tags get a boost
                double tagMatchScore = 0.0;
                if (favoriteTagIds.Count > 0)
                {
                    int tagMatches = hotel.Tags.Count(t => favoriteTagIds.Contains(t.Id));
                    tagMatchScore = Math.Min(100, tagMatches * 25.0); // 25 points per matching tag, max 100
                }

                double totalScore = favoriteTagIds.Count > 0
                    ? distanceScore * 0.20 + budgetScore * 0.30 + groupScore * 0.20 + amenitiesScore * 0.10 + tagMatchScore * 0.20
                    : distanceScore * 0.25 + budgetScore * 0.35 + groupScore * 0.25 + amenitiesScore * 0.15;

                // Apply penalty for recently visited locations
                bool isRecentlyVisited = recentlyVisitedLocationIds.Contains(hotel.Id);
                if (isRecentlyVisited)
                {
                    totalScore *= 0.5; // 50% penalty for recently visited
                }

                return new { Hotel = hotel, Score = totalScore, Distance = dist, IsRecentlyVisited = isRecentlyVisited };
            }).ToList();

            // Hard exclude: if enough new options exist, remove recently visited ones completely
            var newOptions = scored.Where(x => !x.IsRecentlyVisited).ToList();
            if (newOptions.Count >= 3)
            {
                scored = newOptions;
            }
            else if (newOptions.Count > 0)
            {
                // Few new options → keep all (with penalty applied)
                scored = scored.OrderByDescending(x => x.Score).ToList();
            }
            else
            {
                // All options are recently visited → sort by penalized score
                scored = scored.OrderByDescending(x => x.Score).ToList();
            }

            var recommendations = new List<AccommodationRecommendationDto>();
            foreach (var item in scored.Take(5).Select((v, i) => new { v, i }))
            {
                var perPerson = GetPerPersonPrice(item.v.Hotel);
                var totalPerNight = perPerson * groupSize;
                var costForGroup = totalPerNight; // Per night cost * group size (accommodation is already per-night based)
                var amenities = item.v.Hotel.LocationAmenities.Select(a => a.Amenity!.Name).Take(5).ToList();
                recommendations.Add(new AccommodationRecommendationDto(
                    item.v.Hotel.Id, item.v.Hotel.Name, item.v.Hotel.Address,
                    item.v.Hotel.Score ?? 0m,
                    toMoney(perPerson),
                    toMoney(totalPerNight),
                    toMoney(costForGroup),
                    Math.Round(item.v.Distance, 2),
                    amenities,
                    item.v.Hotel.Telephone,
                    GetMediaUrls(item.v.Hotel),
                    item.i == 0));
            }

            return (scored.FirstOrDefault()?.Hotel, recommendations);
        }

        // === INTERCITY TRANSPORT (Bus/Train/Plane with hub resolution, no nulls) ===

        private async Task<IntercityTransportDto> BuildIntercityTransportAsync(
            GeoPoint from, GeoPoint to, int groupSize, IList<TransportMode> transportModes,
            FixedIntercitySearchRequest outboundReq, IList<TransitHubs> transitHubs,
            int fromProvinceId, string fromProvinceName, int toProvinceId, string toProvinceName, DateOnly departDate,
            Func<decimal, MoneyDto> toMoney, bool isLuxuryTrip, decimal maxBudgetPerLeg, CancellationToken cancellationToken)
        {
            RouteEstimate? routeEstimate = await _routeMatrixService.EstimateAsync(
                from.Latitude, from.Longitude, to.Latitude, to.Longitude, cancellationToken);

            var rawDistance = routeEstimate?.DistanceKm
                ?? HaversineKm(from.Latitude, from.Longitude, to.Latitude, to.Longitude);
            var distanceKm = double.IsInfinity(rawDistance) || double.IsNaN(rawDistance) || rawDistance > 10_000 ? 500.0 : rawDistance;
            var fallbackDuration = Math.Max(10, (int)Math.Round(distanceKm / DefaultSpeedKmh * 60d));

            var allOptions = new List<TransportOptionDto>();
            var warnings = new List<string>();

            // Find nearest transit hubs (never null IDs - use 0 as fallback)
            var fromTrainHub = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 6);
            var toTrainHub = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 6);
            var fromAirport = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 5);
            var toAirport = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 5);
            // Bus: use dedicated bus hubs only (type 4), do NOT fallback to train/airport
            var fromBusHub = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 4);
            var toBusHub = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 4);

            // === REALISTIC DISTANCE THRESHOLDS ===
            // > 800km: Flight required, bus/train estimates not viable
            // > 400km: Train preferred, bus estimate acceptable
            // <= 400km: Bus/train both viable
            bool requiresFlight = distanceKm > 800;
            bool allowBusEstimate = distanceKm <= 800;
            bool allowTrainEstimate = distanceKm <= 800;

            if (requiresFlight)
            {
                warnings.Add($"Distance {distanceKm:F0}km is very long. Flight is strongly recommended.");
            }

            // 1. Bus search (only if distance <= 800km or we want to allow bus for shorter distances)
            if (allowBusEstimate || !requiresFlight)
            {
                try
                {
                    var busResult = await _fixedIntercityTransportService.SearchBusWithDateFallbackAsync(outboundReq, cancellationToken);
                    if (busResult.IsSuccess && busResult.RecommendedOption is not null)
                    {
                        var opt = busResult.RecommendedOption;
                        var mins = opt.EstimatedTravelMinutes > 0
                            ? opt.EstimatedTravelMinutes : routeEstimate?.DurationMinutes ?? fallbackDuration;
                        
                        // Quality check: flag if duration > 12 hours
                        string? busWarning = null;
                        if (mins > 720) // 12 hours = 720 minutes
                        {
                            busWarning = $"Very long journey ({mins / 60}h {mins % 60}m). Consider alternative transport if available.";
                        }

                        // Append date fallback message if present
                        if (!string.IsNullOrWhiteSpace(busResult.ErrorMessage))
                        {
                            busWarning = string.IsNullOrWhiteSpace(busWarning) 
                                ? busResult.ErrorMessage 
                                : $"{busWarning} {busResult.ErrorMessage}";
                        }

                        // Resolve bus hubs: try matching API's VeXeRe area ID against DB, fallback to API name with null ID
                        var (resolvedFromBusId, resolvedFromBusName) = ResolveBusHubFromApi(
                            opt.FromHubId, opt.FromHubName, fromBusHub, fromProvinceName, transitHubs);
                        var (resolvedToBusId, resolvedToBusName) = ResolveBusHubFromApi(
                            opt.ToHubId, opt.ToHubName, toBusHub, toProvinceName, transitHubs);
                        allOptions.Add(new TransportOptionDto(4, "Bus", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                            resolvedFromBusId, resolvedFromBusName, resolvedToBusId, resolvedToBusName,
                            1, toMoney(opt.EstimatedTotalCost * groupSize), false, busWarning));
                    }
                }
                catch { /* bus search failed */ }
            }

            // 2. Train search (using station codes)
            if (fromTrainHub is not null && toTrainHub is not null)
            {
                try
                {
                    var trainReq = new TrainRouteSearchRequest(
                        fromTrainHub.Code, toTrainHub.Code, departDate, null, null,
                        groupSize, 0, 0, 0, 0, 1, 5);
                    var trainResult = await _fixedIntercityTransportService.SearchTrainWithDateFallbackAsync(trainReq, cancellationToken);
                    if (trainResult.IsSuccess && trainResult.RecommendedOption is not null)
                    {
                        var opt = trainResult.RecommendedOption;
                        var mins = opt.EstimatedTravelMinutes > 0
                            ? opt.EstimatedTravelMinutes : routeEstimate?.DurationMinutes ?? fallbackDuration;
                        
                        // Quality check: flag if duration > 12 hours
                        string? trainWarning = null;
                        if (mins > 720) // 12 hours = 720 minutes
                        {
                            trainWarning = $"Very long journey ({mins / 60}h {mins % 60}m). Consider alternative transport if available.";
                        }

                        // Append date fallback message if present
                        if (!string.IsNullOrWhiteSpace(trainResult.ErrorMessage))
                        {
                            trainWarning = string.IsNullOrWhiteSpace(trainWarning) 
                                ? trainResult.ErrorMessage 
                                : $"{trainWarning} {trainResult.ErrorMessage}";
                        }

                        allOptions.Add(new TransportOptionDto(6, "Train", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                            fromTrainHub?.Id, FormatTransitHubName(fromTrainHub, "Train"), toTrainHub?.Id, FormatTransitHubName(toTrainHub, "Train"),
                            1, toMoney(opt.EstimatedTotalCost * groupSize), false, trainWarning));
                    }
                }
                catch { /* train search failed */ }
            }

            // 3. Flight search (using IATA codes, distance > 100km)
            if (fromAirport is not null && toAirport is not null && distanceKm > 100)
            {
                try
                {
                    var flightReq = new FlightRouteSearchRequest(
                        fromAirport.Code, toAirport.Code, departDate, null, FlightCabinTypes.Economy,
                        groupSize, 0, 0, 1, 5);
                    var flightResult = await _fixedIntercityTransportService.SearchFlightWithDateFallbackAsync(flightReq, cancellationToken);
                    if (flightResult.IsSuccess && flightResult.RecommendedOption is not null)
                    {
                        var opt = flightResult.RecommendedOption;
                        var mins = opt.EstimatedTravelMinutes > 0
                            ? opt.EstimatedTravelMinutes : Math.Max(60, (int)Math.Round(distanceKm / 800.0 * 60.0) + 90);

                        // Append date fallback message if present
                        string? flightNote = opt.Note;
                        if (!string.IsNullOrWhiteSpace(flightResult.ErrorMessage))
                        {
                            flightNote = string.IsNullOrWhiteSpace(flightNote) 
                                ? flightResult.ErrorMessage 
                                : $"{flightNote} {flightResult.ErrorMessage}";
                        }

                        allOptions.Add(new TransportOptionDto(5, "Plane", mins, toMoney(opt.EstimatedTotalCost), false, flightNote,
                            fromAirport?.Id, FormatTransitHubName(fromAirport, "Plane"), toAirport?.Id, FormatTransitHubName(toAirport, "Plane"),
                            1, toMoney(opt.EstimatedTotalCost * groupSize)));
                    }
                }
                catch { /* flight search failed */ }
            }

            // Bracket fallbacks for missing transport types
            if (!allOptions.Any(o => o.Method.Equals("Bus", StringComparison.OrdinalIgnoreCase)))
            {
                if (allowBusEstimate)
                {
                    var fromBusHubIdFallback = fromBusHub?.Id;
                    var fromBusHubNameFallback = fromBusHub is not null ? FormatTransitHubName(fromBusHub, "Bus") : $"{fromProvinceName} Bus Station";
                    var toBusHubIdFallback = toBusHub?.Id;
                    var toBusHubNameFallback = toBusHub is not null ? FormatTransitHubName(toBusHub, "Bus") : $"{toProvinceName} Bus Station";
                    
                    var busDuration = routeEstimate?.DurationMinutes ?? fallbackDuration;
                    string? busEstimateWarning = $"Bus estimate (API unavailable).";
                    if (busDuration > 720)
                    {
                        busEstimateWarning += $" Very long journey ({busDuration / 60}h {busDuration % 60}m). Not recommended - consider flight.";
                    }
                    else if (requiresFlight)
                    {
                        busEstimateWarning += $" Distance {distanceKm:F0}km is very long. Flight strongly recommended.";
                    }

                    allOptions.Add(new TransportOptionDto(4, "Bus",
                        busDuration,
                        toMoney(GetBusBracketCost(distanceKm)), false,
                        "Estimated pricing (API unavailable)", fromBusHubIdFallback, fromBusHubNameFallback, toBusHubIdFallback, toBusHubNameFallback,
                        1, toMoney(GetBusBracketCost(distanceKm) * groupSize), true, busEstimateWarning));
                }
            }
            if (!allOptions.Any(o => o.Method.Equals("Train", StringComparison.OrdinalIgnoreCase)) && distanceKm > 100)
            {
                if (allowTrainEstimate)
                {
                    var trainMins = Math.Max(60, (int)Math.Round(distanceKm / 50.0 * 60.0));
                    string? trainEstimateWarning = "Train estimate (API unavailable).";
                    if (trainMins > 720)
                    {
                        trainEstimateWarning += $" Very long journey ({trainMins / 60}h {trainMins % 60}m). Not recommended - consider flight.";
                    }
                    else if (requiresFlight)
                    {
                        trainEstimateWarning += $" Distance {distanceKm:F0}km is very long. Flight strongly recommended.";
                    }

                    allOptions.Add(new TransportOptionDto(6, "Train", trainMins,
                        toMoney(GetTrainBracketCost(distanceKm)), false,
                        "Estimated pricing (API unavailable)", fromTrainHub?.Id, FormatTransitHubName(fromTrainHub, "Train"), toTrainHub?.Id, FormatTransitHubName(toTrainHub, "Train"),
                        1, toMoney(GetTrainBracketCost(distanceKm) * groupSize), true, trainEstimateWarning));
                }
            }
            if (!allOptions.Any(o => o.Method.Equals("Plane", StringComparison.OrdinalIgnoreCase)) && distanceKm > 200)
            {
                var planeMins = Math.Max(60, (int)Math.Round(distanceKm / 800.0 * 60.0) + 90);
                string? planeEstimateWarning = "Flight estimate (API unavailable).";
                if (requiresFlight && planeMins == 0)
                {
                    planeEstimateWarning += $" No flights available for this route. Consider changing travel date.";
                }

                allOptions.Add(new TransportOptionDto(5, "Plane", planeMins,
                    toMoney(GetPlaneBracketCost(distanceKm)), false,
                    "Estimated pricing (API unavailable)", fromAirport?.Id, FormatTransitHubName(fromAirport, "Plane"), toAirport?.Id, FormatTransitHubName(toAirport, "Plane"),
                    1, toMoney(GetPlaneBracketCost(distanceKm) * groupSize), true, planeEstimateWarning));
            }

            if (allOptions.Count == 0)
            {
                var bracketCostPerPerson = GetBracketCostPerPerson(distanceKm);
                var bracketMethod = SelectTransportCategory(distanceKm, groupSize);
                var bracketDuration = routeEstimate?.DurationMinutes ?? fallbackDuration;
                
                string genericWarning = $"No transport options found via APIs. Using {bracketMethod} estimate.";
                if (bracketDuration > 720)
                {
                    genericWarning += $" Very long journey ({bracketDuration / 60}h {bracketDuration % 60}m). Consider changing travel date or route.";
                }

                allOptions.Add(new TransportOptionDto(0, bracketMethod,
                    bracketDuration, toMoney(bracketCostPerPerson), true,
                    "Estimated pricing (no API results)", null, null, null, null, 1, toMoney(bracketCostPerPerson * groupSize), true, genericWarning));
            }

            // Mark best as recommended
            var affordableOptions = allOptions.Where(o => o.EstimatedTotalCost.BaseAmount * groupSize <= maxBudgetPerLeg).ToList();
            var candidateList = affordableOptions.Count > 0 ? affordableOptions : allOptions;

            TransportOptionDto recommended;
            if (isLuxuryTrip)
            {
                recommended = candidateList
                    .OrderByDescending(o => o.Method == "Plane")
                    .ThenByDescending(o => o.Method == "Train")
                    .ThenBy(o => o.EstimatedTotalCost.BaseAmount > 0 ? o.EstimatedTotalCost.BaseAmount : decimal.MaxValue)
                    .First();
            }
            else
            {
                recommended = candidateList
                    .OrderBy(o => o.EstimatedTotalCost.BaseAmount > 0 ? o.EstimatedTotalCost.BaseAmount : decimal.MaxValue)
                    .First();
            }
            var finalOptions = allOptions
                .Select(o => o with { Recommended = ReferenceEquals(o, recommended) })
                .ToList();

            // Collect all warnings from recommended option and general warnings
            var allWarnings = string.Join("; ", warnings);
            if (!string.IsNullOrWhiteSpace(recommended.Warning))
            {
                allWarnings = string.IsNullOrWhiteSpace(allWarnings) 
                    ? recommended.Warning 
                    : $"{allWarnings}; {recommended.Warning}";
            }

            var zeroMoney = toMoney(0);
            return new IntercityTransportDto(fromProvinceId, fromProvinceName, toProvinceId, toProvinceName,
                Math.Round(distanceKm, 2),
                null, 0, zeroMoney,
                finalOptions,
                string.IsNullOrWhiteSpace(allWarnings) ? null : allWarnings);
        }

        // === LOCAL TRANSPORT (DynamicLocal - no hub/province fields, hub IDs = 0) ===

        private async Task<LocalTransportResult> BuildLocalTransportAsync(
            GeoPoint from, GeoPoint to, int groupSize, IList<TransportMode> transportModes,
            Func<decimal, MoneyDto> toMoney, CancellationToken cancellationToken)
        {
            RouteEstimate? routeEstimate = null;
            try
            {
                routeEstimate = await _routeMatrixService.EstimateAsync(
                    from.Latitude, from.Longitude, to.Latitude, to.Longitude, cancellationToken);
            }
            catch { /* route estimate failed, use haversine */ }

            var rawDistance = routeEstimate?.DistanceKm
                ?? HaversineKm(from.Latitude, from.Longitude, to.Latitude, to.Longitude);
            var distanceKm = double.IsInfinity(rawDistance) || double.IsNaN(rawDistance) || rawDistance > 10_000 ? 50.0 : rawDistance;
            var fallbackDuration = Math.Max(10, (int)Math.Round(distanceKm / DefaultSpeedKmh * 60d));

            var candidates = transportModes
                .Where(x => x.Category == CategoryTransport.DynamicLocal && x.LocalTransportMetrics is not null)
                .Select(x =>
                {
                    var metrics = x.LocalTransportMetrics!;
                    var speedKmh = Math.Max(1d, (double)metrics.SpeedKmh);
                    var timeMinutes = Math.Max(5, (int)Math.Round(distanceKm / speedKmh * 60d));
                    var vehicleCount = (int)Math.Ceiling(groupSize / (double)Math.Max(1, x.Capacity));
                    var totalCost = (decimal)distanceKm * metrics.CostPerKm * vehicleCount;
                    var maxDist = metrics.MaxRecommendedDistance.HasValue ? (double)metrics.MaxRecommendedDistance.Value : double.PositiveInfinity;
                    var over = distanceKm - maxDist;
                    var penalty = over > 0 ? over * over * 5d : 0d;
                    var score = timeMinutes * 0.55d + (double)totalCost * 0.00035d + penalty;
                    return new TransportCandidate(x.Id, x.Name, timeMinutes, decimal.Round(totalCost, 2), score,
                        over > 0 ? "Exceeds recommended distance" : "Within recommended distance", vehicleCount);
                })
                .OrderBy(x => x.RankScore)
                .ToList();

            var inRange = candidates.Where(c => c.Note == "Within recommended distance").ToList();
            if (inRange.Count > 0) candidates = inRange.Concat(candidates.Except(inRange)).ToList();

            if (candidates.Count == 0)
            {
                var unknownOpt = new TransportOptionDto(0, "Unknown", fallbackDuration, toMoney(0), true,
                    "No local transport data available", null, null, null, null, 1, toMoney(0));
                return new LocalTransportResult(distanceKm, unknownOpt.Method,
                    unknownOpt.EstimatedTravelMinutes, unknownOpt.EstimatedTotalCost.BaseAmount, 0,
                    new List<TransportOptionDto> { unknownOpt });
            }

            var selected = candidates.First();
            var options = candidates.Take(4).Select((x, idx) => new TransportOptionDto(
                x.TransportModeId, x.Method, x.EstimatedTravelMinutes, toMoney(x.EstimatedTotalCost), idx == 0, x.Note, null, null, null, null,
                x.VehiclesNeeded, toMoney(x.EstimatedTotalCost))).ToList();

            return new LocalTransportResult(distanceKm, selected.Method,
                selected.EstimatedTravelMinutes, selected.EstimatedTotalCost, selected.TransportModeId,
                options);
        }

        // === BRACKET COST FALLBACKS ===

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

        private static TransitHubs? FindNearestHub(
            IList<TransitHubs> hubs, double lat, double lng, int transportationId)
        {
            return hubs
                .Where(h => h.TransportationId == transportationId)
                .Select(h => new { Hub = h, Distance = HaversineKm(lat, lng, h.Latitude, h.Longitude) })
                .OrderBy(h => h.Distance)
                .Select(h => h.Hub)
                .FirstOrDefault();
        }

        private static TransitHubs? FindNearestHubAny(
            IList<TransitHubs> hubs, double lat, double lng)
        {
            return hubs
                .Select(h => new { Hub = h, Distance = HaversineKm(lat, lng, h.Latitude, h.Longitude) })
                .OrderBy(h => h.Distance)
                .Select(h => h.Hub)
                .FirstOrDefault();
        }

        /// <summary>
        /// Resolves bus hub ID and name for the itinerary output.
        /// Priority:
        /// 1. If API returned a hub ID, try to match it against TransitHubs.Id in the DB.
        ///    If found → use DB hub ID + API name (or DB name if API name is missing).
        /// 2. If API returned a hub name but ID not in DB → use API name with null ID.
        /// 3. If API returned nothing → fallback to FindNearestHub result or province name.
        /// </summary>
        private static (int? HubId, string HubName) ResolveBusHubFromApi(
            int? apiHubId, string? apiHubName,
            TransitHubs? nearestBusHub, string provinceFallbackName,
            IList<TransitHubs> transitHubs)
        {
            // Case 1: API provided an ID → try to match against DB
            if (apiHubId.HasValue)
            {
                var dbHub = transitHubs.FirstOrDefault(h => h.Id == apiHubId.Value);
                if (dbHub is not null)
                {
                    // Exact ID match in DB → use DB hub ID + DB hub name
                    var name = FormatTransitHubName(dbHub, "Bus") ?? dbHub.Name;
                    return (dbHub.Id, name);
                }

                // API ID doesn't exist in our DB → use API name, null ID
                if (!string.IsNullOrWhiteSpace(apiHubName))
                    return (null, apiHubName);
            }

            // Case 2: API provided name only (no ID or ID not matched) → use API name, null ID
            if (!string.IsNullOrWhiteSpace(apiHubName))
                return (null, apiHubName);

            // Case 3: API provided nothing → fallback to nearest hub in DB or province name
            if (nearestBusHub is not null)
                return (nearestBusHub.Id, FormatTransitHubName(nearestBusHub, "Bus") ?? nearestBusHub.Name);

            return (null, $"{provinceFallbackName} Bus Station");
        }

        private static TransportOptionDto GetRecommendedOption(IntercityTransportDto transport)
            => transport.TransportOptions.FirstOrDefault(o => o.Recommended) ?? transport.TransportOptions.First();

        private static string SelectTransportCategory(double distanceKm, int groupSize)
        {
            if (distanceKm > 1000) return "Airplane";
            if (distanceKm > 600) return groupSize > 4 ? "Airplane" : "Train";
            if (distanceKm > 300) return "Train";
            return "Bus";
        }

        // === PROVINCE RESOLUTION FROM COORDINATES ===

        private static int ResolveProvinceFromCoords(
            double latitude, double longitude, IList<TransitHubs> transitHubs, int fallbackProvinceId)
        {
            if (transitHubs.Count == 0) return fallbackProvinceId;

            var nearest = transitHubs
                .Where(h => h.District.ProvinceId.HasValue)
                .Select(h => new { h.District.ProvinceId, Distance = HaversineKm(latitude, longitude, h.Latitude, h.Longitude) })
                .OrderBy(h => h.Distance)
                .FirstOrDefault();

            return nearest?.ProvinceId ?? fallbackProvinceId;
        }

        // === SHARED HELPERS ===

        private static string ResolveWeatherLocationFromProvince(Province province, IList<Location> locations)
        {
            var name = locations.Where(x => x.District != null && x.District.ProvinceId.HasValue && x.District.ProvinceId.Value == province.Id)
                .Select(x => x.District?.Province?.EnglishName)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .GroupBy(x => x!, StringComparer.OrdinalIgnoreCase)
                .OrderByDescending(x => x.Count())
                .Select(x => x.Key)
                .FirstOrDefault();
            return !string.IsNullOrWhiteSpace(name) ? name : province.Name;
        }

        /// <summary>
        /// Returns true when the intercity transport has NO real transit-hub support
        /// (all options have null FromTransitHubId and null ToTransitHubId).
        /// When true, the caller should fall back to a single direct local transfer
        /// instead of generating the 3-segment hub-based transfer.
        /// </summary>
        private static bool HasNoTransitHubSupport(IntercityTransportDto transport) =>
            transport.TransportOptions.All(o => !o.FromTransitHubId.HasValue && !o.ToTransitHubId.HasValue);

        private static bool IsAccommodationType(Location location)
        {
            return location.LocationTypeId == 3
                || (location.LocationType != null && location.LocationType.Name.Contains("Accommodation", StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsOpenAtTime(Location location, DayOfWeek dayOfWeek, TimeOnly time)
        {
            // Case 2: No opening hours at all -> assume open 24/7
            if (location.OpeningHours.Count == 0) return true;

            // Case 1: Location HAS opening hours
            var dayHours = location.OpeningHours.Where(o => o.DayOfWeek == dayOfWeek).ToList();

            // If no opening hours for this specific day -> location is closed on this day
            if (dayHours.Count == 0) return false;

            // Check if the time falls within any valid opening hour range
            var ts = time.ToTimeSpan();
            return dayHours.Any(oh => oh.OpenTime.HasValue && oh.CloseTime.HasValue && ts >= oh.OpenTime.Value && ts <= oh.CloseTime.Value);
        }

        private static decimal GetPerPersonPrice(Location location)
        {
            var min = location.PriceMinUsd ?? 0;
            var max = location.PriceMaxUsd ?? 0;
            if (min <= 0 && max <= 0) return 0;
            if (min > 0 && max > 0) return Math.Round((min + max) / 2m, 0);
            return Math.Max(min, max);
        }

        private static double NormalizeScore(decimal? score)
        {
            var raw = (double)(score ?? 0);
            if (raw <= 0) return 50;
            if (raw <= 5) return raw * 20;
            if (raw <= 10) return raw * 10;
            return Math.Clamp(raw, 0, 100);
        }

        private static DateTime AddMinutes(DateTime value, int minutes)
        {
            if (minutes < 0) minutes = 0;
            if (minutes > 1440) minutes = 1440;
            return value.AddMinutes(minutes);
        }

        private static DateTime Max(DateTime a, DateTime b) => a >= b ? a : b;

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

        private static double HaversineKmOrMax(double? lat1, double? lng1, double? lat2, double? lng2)
        {
            if (!lat1.HasValue || !lng1.HasValue || !lat2.HasValue || !lng2.HasValue) return double.MaxValue;
            return HaversineKm(lat1.Value, lng1.Value, lat2.Value, lng2.Value);
        }

        private static double ToRadians(double degree) => degree * (Math.PI / 180d);

        // === INNER TYPES ===

        private sealed record ScoredLocation(Location Location, double CompositeScore);

        private static string? FormatTransitHubName(TransitHubs? hub, string method)
        {
            if (hub is null) return null;
            // Bus: name only; Train/Plane: CODE - Name
            var typeName = hub.TransitHubType?.Name?.ToLowerInvariant() ?? "";
            if (typeName.Contains("bus"))
                return hub.Name;
            return $"{hub.Code} - {hub.Name}";
        }

        private static IList<string> GetMediaUrls(Location location, int maxCount = 3)
        {
            return location.LocationMedias
                .Select(m => m.Link)
                .Take(maxCount)
                .ToList();
        }

        private static IList<string> GetTags(Location location)
        {
            return location.LocationTags.Select(lt => lt.Tag!.Name).ToList();
        }

        private sealed record GeoPoint(string DisplayName, double Latitude, double Longitude)
        {
            public static GeoPoint FromLocation(Location location) =>
                new(location.Name, location.Latitude, location.Longitude);
        }

        private sealed record TransportCandidate(
            int TransportModeId, string Method, int EstimatedTravelMinutes, decimal EstimatedTotalCost,
            double RankScore, string Note, int VehiclesNeeded);

        private sealed record LocalTransportResult(
            double DistanceKm, string SelectedMethod, int SelectedTravelTimeMinutes,
            decimal SelectedTotalCost, int SelectedTransportModeId,
            IList<TransportOptionDto> TransportOptions);
    }
}
