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

        private static readonly TimeOnly LunchStart = new(11, 30);
        private static readonly TimeOnly LunchEnd = new(13, 30);
        private static readonly TimeOnly DinnerStart = new(18, 0);
        private static readonly TimeOnly DinnerEnd = new(20, 0);

        private readonly IAppDbContext _context;
        private readonly IRouteMatrixService _routeMatrixService;
        private readonly IWeatherAdvisoryService _weatherAdvisoryService;
        private readonly IFixedIntercityTransportService _fixedIntercityTransportService;
        private readonly ICurrencyService _currencyService;

        public GenerateItineraryQueryHandler(
            IAppDbContext context,
            IRouteMatrixService routeMatrixService,
            IWeatherAdvisoryService weatherAdvisoryService,
            IFixedIntercityTransportService fixedIntercityTransportService,
            ICurrencyService currencyService)
        {
            _context = context;
            _routeMatrixService = routeMatrixService;
            _weatherAdvisoryService = weatherAdvisoryService;
            _fixedIntercityTransportService = fixedIntercityTransportService;
            _currencyService = currencyService;
        }

        public async Task<ErrorOr<GeneratedItineraryDto>> Handle(
            GenerateItineraryQuery query,
            CancellationToken cancellationToken)
        {
            var request = query.Request;
            var notes = new List<string>();
            bool hasHotelPreference = !string.IsNullOrWhiteSpace(request.HotelPreference);

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
                // Filter: exclude "Travel Service" type, only Active & TemporarilyClosed (not Inactive) & not deleted
                .Where(x => x.LocationType != null && x.LocationType.Name != "Travel Service")
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

            // Separate accommodations BEFORE tag filtering so hotels aren't excluded by tag preferences
            var accommodations = hasHotelPreference
                ? locations.Where(IsAccommodationType).ToList()
                : new List<Location>();
            var nonAccommodationLocations = locations.Where(x => !IsAccommodationType(x)).ToList();

            // STAGE 2: Tag Scoring and Filtering (applies only to attractions)
            if (favoriteTagIds.Count > 0)
            {
                var tagFiltered = nonAccommodationLocations.Where(x =>
                    x.Tags.Any(t => favoriteTagIds.Contains(t.Id))).ToList();
                notes.Add($"Tag ID filter matched {tagFiltered.Count}/{nonAccommodationLocations.Count} locations.");
                if (tagFiltered.Count > 0) nonAccommodationLocations = tagFiltered;
                else notes.Add("Tag filter returned no results; falling back to all locations.");
            }

            // Filter attractions (Type 1: Tham quan, du l?ch - uu tiên cao)
            var attractions = nonAccommodationLocations.Where(x =>
                x.LocationTypeId == 1 ||
                (x.LocationType != null && x.LocationType.Name.Contains("Attraction", StringComparison.OrdinalIgnoreCase))).ToList();

            // Filter shopping (Type 5: Mua s?m - uu tiên th?p hon, ch? dùng khi h?t attraction)
            var shoppingLocations = nonAccommodationLocations.Where(x =>
                x.LocationTypeId == 5 ||
                (x.LocationType != null && x.LocationType.Name.Contains("Shopping", StringComparison.OrdinalIgnoreCase))).ToList();

            // Keep restaurant/food locations for meal picker (Type 2: Restaurant/Food)
            var restaurantLocations = nonAccommodationLocations.Where(x =>
                x.LocationTypeId == 2 ||
                (x.LocationType != null && (
                    x.LocationType.Name.Contains("Restaurant", StringComparison.OrdinalIgnoreCase) ||
                    x.LocationType.Name.Contains("Food", StringComparison.OrdinalIgnoreCase) ||
                    x.LocationType.Name.Contains("Cafe", StringComparison.OrdinalIgnoreCase)))).ToList();

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

            var scoredAttractions = attractions
                .Select(x => new ScoredLocation(x, ComputeCompositeScore(x, favoriteTagIds)))
                .OrderByDescending(x => x.CompositeScore).ToList();

            // Score shopping locations (mixed with attractions, compete naturally by score)
            var scoredShopping = shoppingLocations
                .Select(x => new ScoredLocation(x, ComputeCompositeScore(x, favoriteTagIds)))
                .OrderByDescending(x => x.CompositeScore).ToList();

            // Score restaurant locations separately for meal picker
            var scoredRestaurants = restaurantLocations
                .Select(x => new ScoredLocation(x, ComputeCompositeScore(x, favoriteTagIds)))
                .OrderByDescending(x => x.CompositeScore).ToList();

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

            var transportModes = await _context.TransportModes
                .AsNoTracking()
                .Include(x => x.LocalTransportMetrics)
                .ToListAsync(cancellationToken);

            // STAGE 5: First-Mile and Inter-City Transport
            var firstDest = orderedDestinations.First();
            var firstDestGeo = new GeoPoint(firstDest.EnglishName, firstDest.Latitude ?? 0, firstDest.Longitude ?? 0);

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
                    userProvinceId, userProvinceName, firstDest.Id, firstDest.EnglishName, 
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
                    transitHubs, userProvinceId, userProvinceName, firstDest.Id, firstDest.EnglishName, request.StartDate, toMoney, isLuxuryTrip, cancellationToken);
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
                        new GeoPoint(fromDest.EnglishName, fromDest.Latitude ?? 0, fromDest.Longitude ?? 0),
                        new GeoPoint(toDest.EnglishName, toDest.Latitude ?? 0, toDest.Longitude ?? 0),
                        groupSize, transportModes, segReq, transitHubs, fromDest.Id, fromDest.EnglishName, toDest.Id, toDest.EnglishName, segDate, toMoney, isLuxuryTrip, cancellationToken);
                    interDestTransports.Add(seg);
                    totalTransportBudget += GetRecommendedOption(seg).EstimatedTotalCost.BaseAmount;
                }
                else
                {
                    var localDto = await BuildLocalTransportAsync(
                        new GeoPoint(fromDest.EnglishName, fromDest.Latitude ?? 0, fromDest.Longitude ?? 0),
                        new GeoPoint(toDest.EnglishName, toDest.Latitude ?? 0, toDest.Longitude ?? 0),
                        groupSize, transportModes, toMoney, cancellationToken);
                    interDestTransports.Add(new IntercityTransportDto(
                        fromDest.Id, fromDest.EnglishName, toDest.Id, toDest.EnglishName,
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
                    new GeoPoint(lastDest.EnglishName, lastDest.Latitude ?? 0, lastDest.Latitude ?? 0), userGeo,
                    groupSize, transportModes, returnReq, transitHubs, lastDest.Id, lastDest.EnglishName, userProvinceId, userProvinceName, request.EndDate, toMoney, isLuxuryTrip, cancellationToken);
            }
            else
            {
                var localDto = await BuildLocalTransportAsync(
                    new GeoPoint(lastDest.EnglishName, lastDest.Latitude ?? 0, lastDest.Longitude ?? 0), userGeo,
                    groupSize, transportModes, toMoney, cancellationToken);
                returnTransport = new IntercityTransportDto(
                    lastDest.Id, lastDest.EnglishName, userProvinceId, userProvinceName,
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
                        toMoney);

                    accommodationRecommendations.AddRange(recommendations);
                    if (hotel is not null)
                    {
                        selectedAccommodations[prov.Id] = hotel;
                        totalAccommodationBudget += GetPerPersonPrice(hotel) * groupSize * nights;

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
                                return new AlternativeLocationDto(
                                    r.LocationId, r.LocationName, tagNames,
                                    toMoney(0),
                                    toMoney(r.PricePerPersonPerNight.BaseAmount),
                                    (double)altHotel.Score,
                                    Math.Round(altDist, 2), altTravelMin,
                                    altHotel.Address, altHotel.Telephone, GetMediaUrls(altHotel));
                            }).ToList();
                        accommodationAlternativesByProvince[prov.Id] = altAccoms;
                    }
                }
            }

            var activityBudget = usableBudget - totalTransportBudget - totalAccommodationBudget;
            if (activityBudget < 0) activityBudget = usableBudget * 0.3m;

            var dayWeights = CalculateDayWeights(totalDays);
            var totalWeight = dayWeights.Values.Sum();

            // STAGE 6: Day-By-Day Scheduling
            var visitedLocationIds = new HashSet<int>();
            var days = new List<ItineraryDayDto>();
            decimal totalTransportCost = 0m;
            decimal totalAccommodationCost = 0m;
            decimal totalActivityCost = 0m;
            decimal rolloverBudget = 0m;
            int globalDayIndex = 0;

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

                    var currentTime = date.ToDateTime(new TimeOnly(6, 30));
                    var dayEndTime = date.ToDateTime(new TimeOnly(22, 00));
                    GeoPoint currentPoint;
                    string? currentLocationName = null;
                    int currentLocationId = 0;
                    bool lunchInserted = false;
                    bool dinnerInserted = false;


                    // === Day 1: Outbound transfer -> Hub -> Hotel (if pref) -> Attractions ===
                    if (globalDayIndex == 0)
                    {
                        var recOpt = GetRecommendedOption(intercityTransport);

                        // 1. Travel from user location to departure transit hub
                        var startHubPoint = new GeoPoint("Hub", userProvince.Latitude ?? 0, userProvince.Longitude ?? 0);
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
                        currentTime = AddMinutes(toStartHubArrival, 10);

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
                        currentTime = AddMinutes(arrivalTime, 20);
                        currentPoint = firstDestGeo;
                        currentLocationName = recOpt.ToTransitHubName;

                        // Transport from hub to hotel or first attraction
                        {
                            GeoPoint hubToTarget;
                            int hubToTargetId;
                            string hubToTargetName;
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
                                    hubToTargetName = currentProvince.EnglishName;
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
                            currentTime = AddMinutes(hubArrival, 10);
                            currentPoint = hubToTarget;
                            currentLocationName = hubToTargetName;
                        }

                        // Hotel check-in (if HotelPreference set)
                        if (destAccommodation is not null)
                        {
                            var checkInStart = Max(currentTime, date.ToDateTime(new TimeOnly(13, 0)));
                            var checkInEnd = AddMinutes(checkInStart, 30);
                            var accPerPerson = GetPerPersonPrice(destAccommodation);
                            var accGroupCost = accPerPerson * groupSize;
                            var accomAlts = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                            var checkInTagNames = GetTags(destAccommodation);
                            
                            // Get accommodation recommendations for this province
                            var accomRecsForCheckIn = accommodationRecommendations
                                .Where(r => {
                                    var hotel = accommodations.FirstOrDefault(a => a.Id == r.LocationId);
                                    return hotel is not null && hotel.District != null && hotel.District.ProvinceId.HasValue && hotel.District.ProvinceId.Value == currentProvince.Id;
                                }).ToList();
                            
                            timeline.Add(new ItineraryTimelineItemDto("check-in",
                                $"Check in at {destAccommodation.Name} - Drop off luggage",
                                TimeOnly.FromDateTime(checkInStart), TimeOnly.FromDateTime(checkInEnd),
                                destAccommodation.Id, checkInTagNames,
                                toMoney(0), toMoney(accPerPerson), toMoney(accGroupCost), "Check in and drop off luggage",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                destAccommodation.Address, destAccommodation.Telephone, GetMediaUrls(destAccommodation),
                                Alternatives: accomAlts is { Count: > 0 } ? accomAlts : null,
                                AccommodationRecommendations: accomRecsForCheckIn.Count > 0 ? accomRecsForCheckIn : null));
                            dayAccommodationCost += accGroupCost;
                            currentTime = AddMinutes(checkInEnd, 10);
                            currentPoint = GeoPoint.FromLocation(destAccommodation);
                            currentLocationName = destAccommodation.Name;
                            currentLocationId = destAccommodation.Id;
                        }
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
                            timeline.Add(new ItineraryTimelineItemDto("check-out",
                                $"Check out from {prevAccom.Name} - Pick up luggage",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(checkoutEnd),
                                prevAccom.Id, checkoutTagNames,
                                toMoney(0), toMoney(0), toMoney(0), "Check out and pick up luggage",
                                Math.Round((double)(prevAccom.Score ?? 0), 2),
                                Alternatives: prevAccomAlts is { Count: > 0 } ? prevAccomAlts : null));
                            currentTime = AddMinutes(checkoutEnd, 10);
                        }

                        var segTransport = interDestTransports[destIdx - 1];
                        var segRecOpt = GetRecommendedOption(segTransport);

                        // Travel from hotel/current location to departure transit hub
                        {
                            var departureHubPoint = new GeoPoint("Hub", prevProvince.Latitude ?? 0, prevProvince.Longitude ?? 0);
                            var toHubTransport = await BuildLocalTransportAsync(
                                prevAccom is not null ? GeoPoint.FromLocation(prevAccom) : new GeoPoint(prevProvince.EnglishName, prevProvince.Latitude ?? 0, prevProvince.Longitude ?? 0),
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
                                    segHubToTarget = new GeoPoint(currentProvince.EnglishName, currentProvince.Latitude ?? 0, currentProvince.Longitude ?? 0);
                                    segHubToTargetId = 0;
                                    segHubToTargetName = currentProvince.EnglishName;
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

                        if (destAccommodation is not null)
                        {
                            var checkInStart = Max(currentTime, date.ToDateTime(new TimeOnly(11, 0)));
                            var checkInEnd = AddMinutes(checkInStart, 30);
                            var accPerPerson = GetPerPersonPrice(destAccommodation);
                            var accGroupCost = accPerPerson * groupSize;
                            var accomAlts2 = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                            var checkIn2TagNames = GetTags(destAccommodation);
                            
                            // Get accommodation recommendations for this province
                            var accomRecsForCheckIn2 = accommodationRecommendations
                                .Where(r => {
                                    var hotel = accommodations.FirstOrDefault(a => a.Id == r.LocationId);
                                    return hotel is not null && hotel.District != null && hotel.District.ProvinceId.HasValue && hotel.District.ProvinceId.Value == currentProvince.Id;
                                }).ToList();
                            
                            timeline.Add(new ItineraryTimelineItemDto("check-in",
                                $"Check in at {destAccommodation.Name} - Drop off luggage",
                                TimeOnly.FromDateTime(checkInStart), TimeOnly.FromDateTime(checkInEnd),
                                destAccommodation.Id, checkIn2TagNames,
                                toMoney(0), toMoney(accPerPerson), toMoney(accGroupCost), "Check in and drop off luggage",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                Alternatives: accomAlts2 is { Count: > 0 } ? accomAlts2 : null,
                                AccommodationRecommendations: accomRecsForCheckIn2.Count > 0 ? accomRecsForCheckIn2 : null));
                            dayAccommodationCost += accGroupCost;
                            currentTime = AddMinutes(checkInEnd, 10);
                            currentPoint = GeoPoint.FromLocation(destAccommodation);
                            currentLocationName = destAccommodation.Name;
                            currentLocationId = destAccommodation.Id;
                        }
                    }
                    // === Normal day (same destination) ===
                    else
                    {
                        currentPoint = destAccommodation is not null
                            ? GeoPoint.FromLocation(destAccommodation)
                            : new GeoPoint(currentProvince.EnglishName, currentProvince.Latitude ?? 0, currentProvince.Longitude ?? 0);
                        currentLocationName = destAccommodation?.Name;
                        currentLocationId = destAccommodation?.Id ?? 0;

                        // Ch? tính accommodation cost n?u:
                        // - Có khách s?n
                        // - KHÔNG ph?i ngày cu?i cùng c?a trip (v? nhà)
                        // - VÀ KHÔNG ph?i ngày cu?i cùng t?i destination này (ngày mai s? di chuy?n)
                        bool isAccomLastDayOfTrip = (globalDayIndex == totalDays - 1);
                        bool isAccomLastDayAtThisDest = (localDay == daysInDest - 1);
                        bool willAccomMoveToNewDestTomorrow = isAccomLastDayAtThisDest && (destIdx < orderedDestinations.Count - 1);

                        if (destAccommodation is not null && localDay > 0 && !isAccomLastDayOfTrip && !willAccomMoveToNewDestTomorrow)
                        {
                            var checkoutEnd = AddMinutes(currentTime, 15);
                            var refreshAlts = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                            var refreshTagNames = GetTags(destAccommodation);
                            timeline.Add(new ItineraryTimelineItemDto("luggage-refresh",
                                $"Room extension / luggage storage at {destAccommodation.Name}",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(checkoutEnd),
                                destAccommodation.Id, refreshTagNames,
                                toMoney(0), toMoney(0), toMoney(0), "Room extension or luggage storage",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                Alternatives: refreshAlts is { Count: > 0 } ? refreshAlts : null));
                            currentTime = AddMinutes(checkoutEnd, 10);
                            dayAccommodationCost += GetPerPersonPrice(destAccommodation) * groupSize;
                        }
                    }

                    // === Greedy Activity Picker with Meal Injection ===
                    var dayOfWeek = date.DayOfWeek;

                    while (currentTime < dayEndTime.AddHours(-1))
                    {
                        var currentTimeOnly = TimeOnly.FromDateTime(currentTime);

                        // Inject Lunch
                        if (!lunchInserted && currentTimeOnly >= LunchStart && currentTimeOnly < LunchEnd)
                        {
                            var mealEnd = date.ToDateTime(LunchEnd);
                            if (mealEnd <= dayEndTime)
                            {
                                var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, out var lunchAlternatives, toMoney);
                                var rLoc = restaurant?.Location;
                                var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                                var mealGroupCost = mealExtraCost * groupSize;
                                var lunchTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                                timeline.Add(new ItineraryTimelineItemDto("meal",
                                    rLoc is not null ? $"Lunch at {rLoc.Name}" : "Lunch",
                                    currentTimeOnly, LunchEnd,
                                    rLoc?.Id ?? 0, lunchTagNames,
                                    toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), "Lunch",
                                    rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                                    Alternatives: lunchAlternatives.Count > 0 ? lunchAlternatives : null));
                                dayActivityCost += mealGroupCost;
                                remainingDayBudget -= mealGroupCost;
                                currentTime = date.ToDateTime(LunchEnd).AddMinutes(15);
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
                                var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, out var dinnerAlternatives, toMoney);
                                var rLoc = restaurant?.Location;
                                var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                                var mealGroupCost = mealExtraCost * groupSize;
                                var dinnerTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                                timeline.Add(new ItineraryTimelineItemDto("meal",
                                    rLoc is not null ? $"Dinner at {rLoc.Name}" : "Dinner",
                                    currentTimeOnly, DinnerEnd,
                                    rLoc?.Id ?? 0, dinnerTagNames,
                                    toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), "Dinner",
                                    rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                                    Alternatives: dinnerAlternatives.Count > 0 ? dinnerAlternatives : null));
                                dayActivityCost += mealGroupCost;
                                remainingDayBudget -= mealGroupCost;
                                currentTime = date.ToDateTime(DinnerEnd).AddMinutes(15);
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

                        if (activityGroupCost > remainingDayBudget) break;

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

                        var extraCostPerPerson = ((nextAttraction.Location.PriceMinUsd ?? 0) + (nextAttraction.Location.PriceMaxUsd ?? 0)) / 2m;

                        var alternativeLocations = alternativeCandidates
                            .Where(a => a.Location.Id != nextAttraction.Location.Id)
                            .Take(3)
                            .Select(a =>
                            {
                                var altDist = HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude,
                                    a.Location.Latitude, a.Location.Longitude);
                                var altTravelMin = (int)Math.Ceiling((altDist / DefaultSpeedKmh) * 60.0);
                                var altTicket = a.Location.TicketPrice;
                                var altExtra = ((a.Location.PriceMinUsd ?? 0) + (a.Location.PriceMaxUsd ?? 0)) / 2m;
                                var altTagNames = GetTags(a.Location);
                                return new AlternativeLocationDto(
                                    a.Location.Id, a.Location.Name, altTagNames,
                                    toMoney(altTicket), toMoney(altExtra),
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
                            toMoney(extraCostPerPerson * groupSize),
                            $"Score: {nextAttraction.CompositeScore:F1}",
                            Math.Round((double)(nextAttraction.Location.Score ?? 0), 2),
                            nextAttraction.Location.Address, nextAttraction.Location.Telephone, GetMediaUrls(nextAttraction.Location),
                            Alternatives: alternativeLocations.Count > 0 ? alternativeLocations : null));

                        dayTransportCost += localTransport.SelectedTotalCost;
                        dayActivityCost += activityGroupCost - localTransport.SelectedTotalCost;
                        remainingDayBudget -= activityGroupCost;

                        visitedLocationIds.Add(nextAttraction.Location.Id);
                        currentPoint = nextPoint;
                        currentLocationName = nextAttraction.Location.Name;
                        currentLocationId = nextAttraction.Location.Id;
                        currentTime = AddMinutes(activityEnd, 15);
                    }

                    // Inject dinner if not yet (late day) — skip on last day (user is heading home)
                    if (!dinnerInserted && globalDayIndex != totalDays - 1 && TimeOnly.FromDateTime(currentTime) < DinnerStart)
                    {
                        var restaurant = PickRestaurantNearby(destMealLocations, currentPoint, visitedLocationIds, out var lateDinnerAlts, toMoney);
                        var rLoc = restaurant?.Location;
                        var mealExtraCost = rLoc is not null ? GetPerPersonPrice(rLoc) : 0m;
                        var mealGroupCost = mealExtraCost * groupSize;
                        var lateDinnerTagNames = rLoc is not null ? GetTags(rLoc) : new List<string>();
                        timeline.Add(new ItineraryTimelineItemDto("meal",
                            rLoc is not null ? $"Dinner at {rLoc.Name}" : "Dinner",
                            DinnerStart, DinnerEnd,
                            rLoc?.Id ?? 0, lateDinnerTagNames,
                            toMoney(0), toMoney(mealExtraCost), toMoney(mealGroupCost), "Dinner",
                            rLoc is not null ? Math.Round((double)(rLoc.Score ?? 0), 2) : 0,
                            Alternatives: lateDinnerAlts.Count > 0 ? lateDinnerAlts : null));
                        dayActivityCost += mealGroupCost;
                        remainingDayBudget -= mealGroupCost;
                    }

                    // Travel back to hotel at end of day (if not already there and not last day)
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
                        currentTime = AddMinutes(returnToHotelArrival, 10);
                        currentPoint = hotelPoint;
                        currentLocationName = destAccommodation.Name;
                        currentLocationId = destAccommodation.Id;
                    }

                    // Evening check-in (for mid-trip days that didn't already check in earlier — skip on last day)
                    if (destAccommodation is not null && globalDayIndex > 0 && globalDayIndex != totalDays - 1 && !(localDay == 0 && destIdx > 0))
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
                            
                            timeline.Add(new ItineraryTimelineItemDto("check-in",
                                $"Check in at {destAccommodation.Name}",
                                TimeOnly.FromDateTime(eveningCheckInStart), TimeOnly.FromDateTime(ciEnd),
                                destAccommodation.Id, eveningTagNames,
                                toMoney(0), toMoney(0), toMoney(0), "Evening rest",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                Alternatives: eveningAlts is { Count: > 0 } ? eveningAlts : null,
                                AccommodationRecommendations: eveningAccomRecs.Count > 0 ? eveningAccomRecs : null));
                        }
                    }

                    // Last day: checkout + travel to hub + return leg
                    if (globalDayIndex == totalDays - 1)
                    {
                        if (destAccommodation is not null)
                        {
                            var coStart = Max(currentTime, date.ToDateTime(new TimeOnly(12, 0)));
                            var coEnd = AddMinutes(coStart, 20);
                            var lastDayAlts = accommodationAlternativesByProvince.GetValueOrDefault(currentProvince.Id);
                            var lastDayTagNames = GetTags(destAccommodation);
                            timeline.Add(new ItineraryTimelineItemDto("check-out",
                                $"Check out from {destAccommodation.Name}",
                                TimeOnly.FromDateTime(coStart), TimeOnly.FromDateTime(coEnd),
                                destAccommodation.Id, lastDayTagNames,
                                toMoney(0), toMoney(0), toMoney(0), "Check out before departure",
                                Math.Round((double)(destAccommodation.Score ?? 0), 2),
                                Alternatives: lastDayAlts is { Count: > 0 } ? lastDayAlts : null));
                            currentTime = AddMinutes(coEnd, 10);
                            currentPoint = GeoPoint.FromLocation(destAccommodation);
                            currentLocationName = destAccommodation.Name;
                            currentLocationId = destAccommodation.Id;
                        }

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
                    }

                    // Day summary
                    var daySpent = dayTransportCost + dayAccommodationCost + dayActivityCost;
                    var budgetLeftover = Math.Max(0, limit - dayActivityCost);
                    var nextDayWeight = dayWeights.GetValueOrDefault(dayNumber + 1, 1.0);
                    var nextDayBase = activityBudget * (decimal)nextDayWeight / (decimal)totalWeight;
                    var nextDayLimit = nextDayBase * 1.3m;
                    rolloverBudget = Math.Min(budgetLeftover, nextDayLimit * 0.5m);

                    // Phân ph?i remaining budget vào ngày cu?i cùng c?a trip
                    bool isLastDayOfTrip = (globalDayIndex == totalDays - 1);
                    if (isLastDayOfTrip)
                    {
                        decimal totalRemaining = usableBudget - totalTransportCost - dayTransportCost 
                            - totalAccommodationCost - dayAccommodationCost - totalActivityCost - dayActivityCost;
                        
                        if (totalRemaining > 0)
                        {
                            dailyBudget += totalRemaining;
                            remainingDayBudget += totalRemaining;
                            notes.Add($"Remaining budget {toMoney(totalRemaining).BaseAmount:N0} VND allocated to last day.");
                        }
                    }

                    totalTransportCost += dayTransportCost;
                    totalAccommodationCost += dayAccommodationCost;
                    totalActivityCost += dayActivityCost;

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

                    days.Add(new ItineraryDayDto(dayNumber, dayTitle, date,
                        currentProvince.Id, weatherSummary,
                        toMoney(baseDailyBudget),
                        toMoney(dailyBudget),
                        toMoney(daySpent),
                        timeline.OrderBy(x => x.StartTime).ToList()));

                    globalDayIndex++;
                }
            }

            // STAGE 7: Budget Validation & Output Assembly
            var estimatedTotal = totalTransportCost + totalAccommodationCost + totalActivityCost;

            if (estimatedTotal > usableBudget)
            {
                var deficit = estimatedTotal - usableBudget;
                var suggestions = new List<string>
                {
                    $"Estimated cost ({estimatedTotal:N0} VND) exceeds usable budget ({usableBudget:N0} VND) by {deficit:N0} VND.",
                    "Suggestions: increase your budget, reduce the number of destinations/days, or remove expensive locations."
                };
                return Error.Validation(
                    "Itinerary.BudgetInsufficient",
                    string.Join(" ", suggestions));
            }

            var budgetSummary = new BudgetSummaryDto(
                toMoney(request.TotalBudget),
                toMoney(contingencyFund),
                toMoney(usableBudget),
                toMoney(totalTransportCost),
                toMoney(totalAccommodationCost),
                toMoney(totalActivityCost),
                toMoney(estimatedTotal),
                toMoney(usableBudget - estimatedTotal));

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
            out List<ScoredLocation> topAlternatives)
        {
            var feasible = new List<(ScoredLocation Location, double DynamicScore)>();

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
                // Relax budget check in the picker - let the main loop handle it
                // if (totalCost > remainingBudget) continue;

                double baseScore = candidate.CompositeScore;
                double distanceScore = Math.Max(0, 100 - distanceKm * 10);
                double remainingMinutes = (dayEndTime - currentTime).TotalMinutes;
                double timeNeeded = travelMinutes + stayDuration;
                double timeEfficiency = Math.Max(0, 100 - (timeNeeded / Math.Max(1, remainingMinutes) * 100));
                double dynamicScore = baseScore * 0.4 + distanceScore * 0.3 + timeEfficiency * 0.3;
                feasible.Add((candidate, dynamicScore));
            }

            if (feasible.Count == 0)
            {
                topAlternatives = new List<ScoredLocation>();
                return null;
            }

            var topCandidates = feasible.OrderByDescending(x => x.DynamicScore).Take(4).ToList();
            topAlternatives = topCandidates.Select(x => x.Location).ToList();
            return topCandidates[Random.Shared.Next(Math.Min(topCandidates.Count, 3))].Location;
        }

        // === MEAL / RESTAURANT PICKER ===

        private static ScoredLocation? PickRestaurantNearby(
            IList<ScoredLocation> attractions, GeoPoint currentPoint, HashSet<int> visitedIds,
            out List<AlternativeLocationDto> alternativeRestaurants, Func<decimal, MoneyDto> toMoney)
        {
            var restaurants = attractions
                .Where(x => !visitedIds.Contains(x.Location.Id))
                .Where(x => x.Location.LocationTypeId == 2 ||
                    (x.Location.LocationType != null && (
                        x.Location.LocationType.Name.Contains("Restaurant", StringComparison.OrdinalIgnoreCase) ||
                        x.Location.LocationType.Name.Contains("Food", StringComparison.OrdinalIgnoreCase) ||
                        x.Location.LocationType.Name.Contains("Cafe", StringComparison.OrdinalIgnoreCase))))
                .OrderBy(x => HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude, x.Location.Latitude, x.Location.Longitude))
                .Take(5)
                .ToList();

            if (restaurants.Count == 0)
            {
                alternativeRestaurants = new List<AlternativeLocationDto>();
                return null;
            }

            var picked = restaurants[Random.Shared.Next(Math.Min(restaurants.Count, 3))];
            alternativeRestaurants = restaurants
                .Where(r => r.Location.Id != picked.Location.Id)
                .Take(3)
                .Select(r =>
                {
                    var dist = HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude,
                        r.Location.Latitude, r.Location.Longitude);
                    var travelMin = (int)Math.Ceiling((dist / DefaultSpeedKmh) * 60.0);
                    var extraCost = ((r.Location.PriceMinUsd ?? 0) + (r.Location.PriceMaxUsd ?? 0)) / 2m;
                    var tagNames = GetTags(r.Location);
                    return new AlternativeLocationDto(
                        r.Location.Id, r.Location.Name, tagNames,
                        toMoney(0), toMoney(extraCost),
                        (double)r.Location.Score,
                        Math.Round(dist, 2), travelMin,
                        r.Location.Address, r.Location.Telephone, GetMediaUrls(r.Location));
                }).ToList();

            return picked;
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
                Province province, Func<decimal, MoneyDto> toMoney)
        {
            if (hotels.Count == 0) return (null, new List<AccommodationRecommendationDto>());

            if (dailyBudget / Math.Max(groupSize, 1) >= 5_000_000m) hotelPreference = "Luxury";

            var (minPrice, maxPrice) = hotelPreference switch
            {
                "Budget" => (0m, 500_000m),
                "Luxury" => (2_000_000m, decimal.MaxValue),
                _ => (500_000m, 2_000_000m)
            };

            var filtered = hotels.Where(h => { var avg = GetPerPersonPrice(h); return avg >= minPrice && avg <= maxPrice; }).ToList();
            if (filtered.Count == 0) filtered = hotels.ToList();

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
                double totalScore = distanceScore * 0.25 + budgetScore * 0.35 + groupScore * 0.25 + amenitiesScore * 0.15;
                return new { Hotel = hotel, Score = totalScore, Distance = dist };
            }).OrderByDescending(x => x.Score).ToList();

            var recommendations = new List<AccommodationRecommendationDto>();
            foreach (var item in scored.Take(5).Select((v, i) => new { v, i }))
            {
                var perPerson = GetPerPersonPrice(item.v.Hotel);
                var totalPerNight = perPerson * groupSize;
                var amenities = item.v.Hotel.LocationAmenities.Select(a => a.Amenity.Name).Take(5).ToList();
                recommendations.Add(new AccommodationRecommendationDto(
                    item.v.Hotel.Id, item.v.Hotel.Name, item.v.Hotel.Address, 
                    item.v.Hotel.Score ?? 0m,
                    toMoney(perPerson),
                    toMoney(totalPerNight),
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
            Func<decimal, MoneyDto> toMoney, bool isLuxuryTrip, CancellationToken cancellationToken)
        {
            RouteEstimate? routeEstimate = await _routeMatrixService.EstimateAsync(
                from.Latitude, from.Longitude, to.Latitude, to.Longitude, cancellationToken);

            var rawDistance = routeEstimate?.DistanceKm
                ?? HaversineKm(from.Latitude, from.Longitude, to.Latitude, to.Longitude);
            var distanceKm = double.IsInfinity(rawDistance) || double.IsNaN(rawDistance) || rawDistance > 10_000 ? 500.0 : rawDistance;
            var fallbackDuration = Math.Max(10, (int)Math.Round(distanceKm / DefaultSpeedKmh * 60d));

            var allOptions = new List<TransportOptionDto>();

            // Find nearest transit hubs (never null IDs - use 0 as fallback)
            var fromTrainHub = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 6);
            var toTrainHub = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 6);
            var fromAirport = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 5);
            var toAirport = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 5);
            // Bus: use dedicated bus hubs only (type 4), do NOT fallback to train/airport
            var fromBusHub = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 4);
            var toBusHub = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 4);

            // 1. Bus search
            try
            {
                var busResult = await _fixedIntercityTransportService.SearchBusAsync(outboundReq, cancellationToken);
                if (busResult.IsSuccess && busResult.RecommendedOption is not null)
                {
                    var opt = busResult.RecommendedOption;
                    var mins = opt.EstimatedTravelMinutes > 0
                        ? opt.EstimatedTravelMinutes : routeEstimate?.DurationMinutes ?? fallbackDuration;
                    // Resolve bus hubs: try matching API's VeXeRe area ID against DB, fallback to API name with null ID
                    var (resolvedFromBusId, resolvedFromBusName) = ResolveBusHubFromApi(
                        opt.FromHubId, opt.FromHubName, fromBusHub, fromProvinceName, transitHubs);
                    var (resolvedToBusId, resolvedToBusName) = ResolveBusHubFromApi(
                        opt.ToHubId, opt.ToHubName, toBusHub, toProvinceName, transitHubs);
                    allOptions.Add(new TransportOptionDto(4, "Bus", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                        resolvedFromBusId, resolvedFromBusName, resolvedToBusId, resolvedToBusName,
                        1, toMoney(opt.EstimatedTotalCost * groupSize)));
                }
            }
            catch { /* bus search failed */ }

            // 2. Train search (using station codes)
            if (fromTrainHub is not null && toTrainHub is not null)
            {
                try
                {
                    var trainReq = new TrainRouteSearchRequest(
                        fromTrainHub.Code, toTrainHub.Code, departDate, null, null,
                        groupSize, 0, 0, 0, 0, 1, 5);
                    var trainResult = await _fixedIntercityTransportService.SearchTrainAsync(trainReq, cancellationToken);
                    if (trainResult.IsSuccess && trainResult.RecommendedOption is not null)
                    {
                        var opt = trainResult.RecommendedOption;
                        var mins = opt.EstimatedTravelMinutes > 0
                            ? opt.EstimatedTravelMinutes : routeEstimate?.DurationMinutes ?? fallbackDuration;
                        allOptions.Add(new TransportOptionDto(6, "Train", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                            fromTrainHub?.Id, FormatTransitHubName(fromTrainHub, "Train"), toTrainHub?.Id, FormatTransitHubName(toTrainHub, "Train"),
                            1, toMoney(opt.EstimatedTotalCost * groupSize)));
                    }
                }
                catch { /* train search failed */ }
            }

            // 3. Flight search (using IATA codes, distance > 200km)
            if (fromAirport is not null && toAirport is not null && distanceKm > 200)
            {
                try
                {
                    var flightReq = new FlightRouteSearchRequest(
                        fromAirport.Code, toAirport.Code, departDate, null, FlightCabinTypes.Economy,
                        groupSize, 0, 0, 1, 5);
                    var flightResult = await _fixedIntercityTransportService.SearchFlightAsync(flightReq, cancellationToken);
                    if (flightResult.IsSuccess && flightResult.RecommendedOption is not null)
                    {
                        var opt = flightResult.RecommendedOption;
                        var mins = opt.EstimatedTravelMinutes > 0
                            ? opt.EstimatedTravelMinutes : Math.Max(60, (int)Math.Round(distanceKm / 800.0 * 60.0) + 90);
                        allOptions.Add(new TransportOptionDto(5, "Plane", mins, toMoney(opt.EstimatedTotalCost), false, opt.Note,
                            fromAirport?.Id, FormatTransitHubName(fromAirport, "Plane"), toAirport?.Id, FormatTransitHubName(toAirport, "Plane"),
                            1, toMoney(opt.EstimatedTotalCost * groupSize)));
                    }
                }
                catch { /* flight search failed */ }
            }

            // Bracket fallbacks for missing transport types
            if (!allOptions.Any(o => o.Method.Equals("Bus", StringComparison.OrdinalIgnoreCase)))
            {
                var fromBusHubIdFallback = fromBusHub?.Id;
                var fromBusHubNameFallback = fromBusHub is not null ? FormatTransitHubName(fromBusHub, "Bus") : $"{fromProvinceName} Bus Station";
                var toBusHubIdFallback = toBusHub?.Id;
                var toBusHubNameFallback = toBusHub is not null ? FormatTransitHubName(toBusHub, "Bus") : $"{toProvinceName} Bus Station";
                allOptions.Add(new TransportOptionDto(4, "Bus",
                    routeEstimate?.DurationMinutes ?? fallbackDuration,
                    toMoney(GetBusBracketCost(distanceKm)), false,
                    "Estimated pricing (API unavailable)", fromBusHubIdFallback, fromBusHubNameFallback, toBusHubIdFallback, toBusHubNameFallback,
                    1, toMoney(GetBusBracketCost(distanceKm) * groupSize)));
            }
            if (!allOptions.Any(o => o.Method.Equals("Train", StringComparison.OrdinalIgnoreCase)) && distanceKm > 100)
            {
                var trainMins = Math.Max(60, (int)Math.Round(distanceKm / 50.0 * 60.0));
                allOptions.Add(new TransportOptionDto(6, "Train", trainMins,
                    toMoney(GetTrainBracketCost(distanceKm)), false,
                    "Estimated pricing (API unavailable)", fromTrainHub?.Id, FormatTransitHubName(fromTrainHub, "Train"), toTrainHub?.Id, FormatTransitHubName(toTrainHub, "Train"),
                    1, toMoney(GetTrainBracketCost(distanceKm) * groupSize)));
            }
            if (!allOptions.Any(o => o.Method.Equals("Plane", StringComparison.OrdinalIgnoreCase)) && distanceKm > 300)
            {
                var planeMins = Math.Max(60, (int)Math.Round(distanceKm / 800.0 * 60.0) + 90);
                allOptions.Add(new TransportOptionDto(5, "Plane", planeMins,
                    toMoney(GetPlaneBracketCost(distanceKm)), false,
                    "Estimated pricing (API unavailable)", fromAirport?.Id, FormatTransitHubName(fromAirport, "Plane"), toAirport?.Id, FormatTransitHubName(toAirport, "Plane"),
                    1, toMoney(GetPlaneBracketCost(distanceKm) * groupSize)));
            }

            if (allOptions.Count == 0)
            {
                var bracketCostPerPerson = GetBracketCostPerPerson(distanceKm);
                var bracketMethod = SelectTransportCategory(distanceKm, groupSize);
                allOptions.Add(new TransportOptionDto(0, bracketMethod,
                    routeEstimate?.DurationMinutes ?? fallbackDuration, toMoney(bracketCostPerPerson), true,
                    "Estimated pricing (no API results)", null, null, null, null, 1, toMoney(bracketCostPerPerson * groupSize)));
            }

            // Mark best as recommended
            TransportOptionDto recommended;
            if (isLuxuryTrip)
            {
                recommended = allOptions
                    .OrderByDescending(o => o.Method == "Plane")
                    .ThenByDescending(o => o.Method == "Train")
                    .ThenBy(o => o.EstimatedTotalCost.BaseAmount > 0 ? o.EstimatedTotalCost.BaseAmount : decimal.MaxValue)
                    .First();
            }
            else
            {
                recommended = allOptions
                    .OrderBy(o => o.EstimatedTotalCost.BaseAmount > 0 ? o.EstimatedTotalCost.BaseAmount : decimal.MaxValue)
                    .First();
            }
            var finalOptions = allOptions
                .Select(o => o with { Recommended = ReferenceEquals(o, recommended) })
                .ToList();

            var zeroMoney = toMoney(0);
            return new IntercityTransportDto(fromProvinceId, fromProvinceName, toProvinceId, toProvinceName,
                Math.Round(distanceKm, 2),
                null, 0, zeroMoney,
                finalOptions);
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
