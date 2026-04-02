using System.Globalization;
using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Itineraries.ItineraryDefaults;

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
        public int MinimumAge { get; set; }
        public decimal TotalBudget { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public string? HotelPreference { get; set; }
        public string TripSegment { get; set; } = "Standard";
    }

    // --- MediatR Query ---

    public record GenerateItineraryQuery(TripPlanRequest Request)
        : IRequest<ErrorOr<GeneratedItineraryDto>>;

    // --- DTOs (IDs only, no nulls) ---

    public record GeneratedItineraryDto(
        UserLocation UserLocation,
        List<DestinationRequest> Destinations,
        DateOnly StartDate,
        DateOnly EndDate,
        int GroupSize,
        string CurrencyCode,
        BudgetSummaryDto BudgetSummary,
        IntercityTransportDto IntercityTransport,
        IList<AccommodationRecommendationDto> AccommodationRecommendations,
        IList<ItineraryDayDto> Days,
        IList<string> Notes);

    public record BudgetSummaryDto(
        MoneyDto TotalBudget,
        MoneyDto ContingencyFund,
        MoneyDto UsableBudget,
        MoneyDto EstimatedTransportCost,
        MoneyDto EstimatedAccommodationCost,
        MoneyDto EstimatedActivityCost,
        MoneyDto EstimatedTotalCost,
        MoneyDto RemainingBudget);

    public record MoneyDto(
        decimal Amount,
        string Currency,
        decimal BaseAmount,
        string BaseCurrency);

    public record IntercityTransportDto(
        int FromProvinceId,
        int ToProvinceId,
        double DistanceKm,
        string SelectedMethod,
        int SelectedTravelTimeMinutes,
        MoneyDto SelectedTotalCost,
        IList<TransportOptionDto> TransportOptions);

    public record TransportOptionDto(
        string Method,
        int EstimatedTravelMinutes,
        MoneyDto EstimatedTotalCost,
        bool Recommended,
        string Note,
        int FromTransitHubId,
        int ToTransitHubId,
        int VehiclesNeeded,
        MoneyDto CostForGroup);

    public record ItineraryDayDto(
        int DayNumber,
        DateOnly Date,
        int ProvinceId,
        string WeatherSummary,
        MoneyDto DailyBudget,
        MoneyDto EstimatedDayCost,
        MoneyDto RolloverToNextDay,
        IList<ItineraryTimelineItemDto> Timeline,
        IList<TravelLegDto> TravelLegs);

    public record ItineraryTimelineItemDto(
        string EventType,
        string Title,
        TimeOnly StartTime,
        TimeOnly EndTime,
        int LocationId,
        int LocationTypeId,
        IList<int> TagIds,
        MoneyDto TicketCost,
        MoneyDto ExtraCostPerPerson,
        MoneyDto CostForGroup,
        string Note);

    public record TravelLegDto(
        int FromProvinceId,
        int ToProvinceId,
        TimeOnly DepartureTime,
        TimeOnly ArrivalTime,
        double DistanceKm,
        string SelectedMethod,
        int SelectedTravelTimeMinutes,
        MoneyDto SelectedTotalCost,
        IList<TransportOptionDto> TransportOptions);

    public record AccommodationRecommendationDto(
        int LocationId,
        string LocationName,
        string Address,
        double Score,
        MoneyDto PricePerPersonPerNight,
        MoneyDto TotalCostPerNight,
        double DistanceToCenter,
        int AmenityCount,
        bool IsRecommended,
        int ProvinceId,
        string ProvinceName,
        int Nights,
        TimeOnly CheckInTime,
        TimeOnly CheckOutTime,
        int CheckInDurationMinutes,
        int CheckOutDurationMinutes,
        string LuggageStorageNote);

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
            RuleFor(x => x.Request.MinimumAge).GreaterThanOrEqualTo(0);
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
                .Where(x => !x.IsDeleted)
                .Where(x => x.Status == LocationStatus.Active)
                .Where(x => x.Score >= 0)
                .Where(x => allProvIds.Contains(x.ProvinceId));

            if (districtFilter.Count > 0)
            {
                var allDistrictIds = districtFilter.SelectMany(kv => kv.Value).ToHashSet();
                var provsWithFilter = districtFilter.Keys.ToHashSet();
                var provsWithout = allProvIds.Except(provsWithFilter).ToHashSet();

                locationQuery = locationQuery.Where(x =>
                    provsWithout.Contains(x.ProvinceId) ||
                    allDistrictIds.Contains(x.DistrictId));
            }

            if (request.MinimumAge > 0)
            {
                locationQuery = locationQuery.Where(x =>
                    !x.MinimumAge.HasValue || x.MinimumAge <= request.MinimumAge);
            }

            var locations = await locationQuery
                .Include(x => x.LocationType)
                .Include(x => x.District).ThenInclude(x => x.Province)
                .Include(x => x.OpeningHours)
                .Include(x => x.Tags)
                .Include(x => x.Amenities)
                .ToListAsync(cancellationToken);

            // Handle destinations with no locations — suggest nearby provinces
            var provinceIdsWithLocations = locations.Select(x => x.ProvinceId).Distinct().ToHashSet();
            var emptyProvinceIds = allProvIds.Except(provinceIdsWithLocations).ToHashSet();

            if (emptyProvinceIds.Count > 0)
            {
                var emptyProvinces = destinationProvinces
                    .Where(p => emptyProvinceIds.Contains(p.Id)).ToList();

                var candidateProvinces = await _context.Provinces
                    .AsNoTracking()
                    .Where(p => !p.IsDeleted && !allProvIds.Contains(p.Id))
                    .ToListAsync(cancellationToken);

                foreach (var emptyProv in emptyProvinces)
                {
                    // Find 5 nearest candidate provinces
                    var nearest = candidateProvinces
                        .Select(p => new
                        {
                            Province = p,
                            Distance = HaversineKm(emptyProv.Latitude, emptyProv.Longitude,
                                                   p.Latitude, p.Longitude)
                        })
                        .OrderBy(x => x.Distance)
                        .Take(NearbyProvinceCandidateCount)
                        .ToList();

                    var nearbyIds = nearest.Select(x => x.Province.Id).ToList();

                    // Check which nearby provinces actually have active locations
                    var nearbyProvIdsWithLoc = await _context.Locations
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted && x.Status == LocationStatus.Active && x.Score >= 0)
                        .Where(x => nearbyIds.Contains(x.ProvinceId))
                        .Select(x => x.ProvinceId)
                        .Distinct()
                        .ToListAsync(cancellationToken);

                    var bestNearby = nearest
                        .Where(n => nearbyProvIdsWithLoc.Contains(n.Province.Id))
                        .OrderBy(n => n.Distance)
                        .FirstOrDefault();

                    if (bestNearby is not null)
                    {
                        var suggestedProv = bestNearby.Province;
                        notes.Add($"Tinh '{emptyProv.Name}' khong co dia diem nao phu hop. " +
                                  $"Goi y thay the bang tinh lan can '{suggestedProv.Name}' (cach {bestNearby.Distance:F0}km).");

                        // Substitute the empty province with the suggested one
                        var idx = destinationProvinces.FindIndex(p => p.Id == emptyProv.Id);
                        if (idx >= 0) destinationProvinces[idx] = suggestedProv;

                        allProvIds.Remove(emptyProv.Id);
                        allProvIds.Add(suggestedProv.Id);

                        // Load locations for the suggested province
                        var suggestedLocQuery = _context.Locations
                            .AsNoTracking()
                            .Where(x => !x.IsDeleted && x.Status == LocationStatus.Active && x.Score >= 0)
                            .Where(x => x.ProvinceId == suggestedProv.Id);

                        if (request.MinimumAge > 0)
                            suggestedLocQuery = suggestedLocQuery.Where(x =>
                                !x.MinimumAge.HasValue || x.MinimumAge <= request.MinimumAge);

                        var suggestedLocations = await suggestedLocQuery
                            .Include(x => x.LocationType)
                            .Include(x => x.District).ThenInclude(x => x.Province)
                            .Include(x => x.OpeningHours)
                            .Include(x => x.Tags)
                            .Include(x => x.Amenities)
                            .ToListAsync(cancellationToken);

                        locations.AddRange(suggestedLocations);
                        candidateProvinces.Remove(suggestedProv);
                    }
                    else
                    {
                        notes.Add($"Tinh '{emptyProv.Name}' khong co dia diem nao phu hop " +
                                  $"va khong tim thay tinh lan can co dia diem.");
                    }
                }
            }

            if (locations.Count == 0)
                return Error.NotFound("Itinerary.Location", "No locations match current filters.");

            // Load transit hubs
            var transitHubs = await _context.TransitHubs
                .AsNoTracking()
                .Include(x => x.TransportMode)
                .ToListAsync(cancellationToken);

            var favoriteTagIds = request.UserFavoriteTagIds.ToHashSet();

            // STAGE 2: Tag Scoring and Filtering
            if (favoriteTagIds.Count > 0)
            {
                var tagFiltered = locations.Where(x =>
                    x.Tags.Any(t => favoriteTagIds.Contains(t.Id))).ToList();
                notes.Add($"Tag ID filter matched {tagFiltered.Count}/{locations.Count} locations.");
                if (tagFiltered.Count > 0) locations = tagFiltered;
                else notes.Add("Tag filter returned no results; falling back to all locations.");
            }

            var accommodations = hasHotelPreference
                ? locations.Where(IsAccommodationType).ToList()
                : new List<Location>();
            var attractions = locations.Where(x => !IsAccommodationType(x)).ToList();

            if (attractions.Count == 0)
                return Error.NotFound("Itinerary.Attraction", "No attraction locations available after filtering.");

            var attractionsByProvince = destinationProvinces.ToDictionary(
                p => p.Id, p => attractions.Where(a => a.ProvinceId == p.Id).ToList());

            destinationProvinces = destinationProvinces
                .Where(p => attractionsByProvince.GetValueOrDefault(p.Id)?.Count > 0).ToList();

            if (destinationProvinces.Count == 0)
                return Error.NotFound("Itinerary.Attraction", "No attractions in any destination province.");

            var scoredAttractions = attractions
                .Select(x => new ScoredLocation(x, ComputeCompositeScore(x, favoriteTagIds)))
                .OrderByDescending(x => x.CompositeScore).ToList();

            var scoredByProvince = destinationProvinces.ToDictionary(
                p => p.Id, p => scoredAttractions.Where(s => s.Location.ProvinceId == p.Id).ToList());

            // STAGE 3: Destination Routing
            var userGeo = new GeoPoint("Your location", request.UserLocation.Latitude, request.UserLocation.Longitude);
            var orderedDestinations = OrderDestinationsByAttractionDensity(
                destinationProvinces, attractionsByProvince, userGeo);
            var dayAllocation = AllocateDaysToDestinations(
                orderedDestinations, attractionsByProvince, totalDays);

            notes.Add($"Destination order: {string.Join(" -> ", orderedDestinations.Select(d => $"{d.Name} ({dayAllocation[d.Id]}d)"))}.");

            // STAGE 4: Budget Decomposition
            var contingencyPercent = CalculateContingencyPercentage(request.TotalBudget);
            var contingencyFund = Math.Round(request.TotalBudget * contingencyPercent, 0);
            var usableBudget = request.TotalBudget - contingencyFund;

            var transportModes = await _context.TransportModes
                .AsNoTracking()
                .Include(x => x.LocalTransportMetrics)
                .ToListAsync(cancellationToken);

            // STAGE 5: First-Mile and Inter-City Transport
            var firstDest = orderedDestinations.First();
            var firstDestGeo = new GeoPoint(firstDest.Name, firstDest.Latitude, firstDest.Longitude);

            var firstMileDistance = HaversineKm(
                request.UserLocation.Latitude, request.UserLocation.Longitude,
                firstDest.Latitude, firstDest.Longitude);

            // Resolve user province from nearest transit hub
            int userProvinceId = ResolveProvinceFromCoords(
                request.UserLocation.Latitude, request.UserLocation.Longitude, transitHubs,
                destinationProvinces.First().Id);

            IntercityTransportDto intercityTransport;

            if (firstMileDistance < FirstMileIntercityThresholdKm)
            {
                var localDto = await BuildLocalTransportAsync(
                    userGeo, firstDestGeo, groupSize, transportModes, toMoney, cancellationToken);
                intercityTransport = new IntercityTransportDto(
                    userProvinceId, firstDest.Id, localDto.DistanceKm,
                    localDto.SelectedMethod, localDto.SelectedTravelTimeMinutes, toMoney(localDto.SelectedTotalCost),
                    localDto.TransportOptions);
                notes.Add($"First-mile: {firstMileDistance:F1}km < {FirstMileIntercityThresholdKm}km -> local transport.");
            }
            else
            {
                var outboundReq = new FixedIntercitySearchRequest(
                    null, request.UserLocation.Latitude, request.UserLocation.Longitude,
                    null, firstDest.Latitude, firstDest.Longitude,
                    request.StartDate, null, 1, 5);

                intercityTransport = await BuildIntercityTransportAsync(
                    userGeo, firstDestGeo, groupSize, transportModes, outboundReq,
                    transitHubs, userProvinceId, firstDest.Id, request.StartDate, toMoney, cancellationToken);
                notes.Add($"First-mile: {firstMileDistance:F1}km >= {FirstMileIntercityThresholdKm}km -> intercity transport.");
            }

            decimal totalTransportBudget = intercityTransport.SelectedTotalCost.BaseAmount;

            var interDestTransports = new List<IntercityTransportDto>();
            int cumulativeDays = 0;
            for (int i = 0; i < orderedDestinations.Count - 1; i++)
            {
                cumulativeDays += dayAllocation[orderedDestinations[i].Id];
                var fromDest = orderedDestinations[i];
                var toDest = orderedDestinations[i + 1];

                var segDistance = HaversineKm(fromDest.Latitude, fromDest.Longitude, toDest.Latitude, toDest.Longitude);
                bool useIntercity = segDistance >= FirstMileIntercityThresholdKm;
                var segDate = request.StartDate.AddDays(cumulativeDays);

                if (useIntercity)
                {
                    var segReq = new FixedIntercitySearchRequest(
                        null, fromDest.Latitude, fromDest.Longitude,
                        null, toDest.Latitude, toDest.Longitude, segDate, null, 1, 5);
                    var seg = await BuildIntercityTransportAsync(
                        new GeoPoint(fromDest.Name, fromDest.Latitude, fromDest.Longitude),
                        new GeoPoint(toDest.Name, toDest.Latitude, toDest.Longitude),
                        groupSize, transportModes, segReq, transitHubs, fromDest.Id, toDest.Id, segDate, toMoney, cancellationToken);
                    interDestTransports.Add(seg);
                    totalTransportBudget += seg.SelectedTotalCost.BaseAmount;
                }
                else
                {
                    var localDto = await BuildLocalTransportAsync(
                        new GeoPoint(fromDest.Name, fromDest.Latitude, fromDest.Longitude),
                        new GeoPoint(toDest.Name, toDest.Latitude, toDest.Longitude),
                        groupSize, transportModes, toMoney, cancellationToken);
                    interDestTransports.Add(new IntercityTransportDto(
                        fromDest.Id, toDest.Id, localDto.DistanceKm,
                        localDto.SelectedMethod, localDto.SelectedTravelTimeMinutes, toMoney(localDto.SelectedTotalCost),
                        localDto.TransportOptions));
                    totalTransportBudget += localDto.SelectedTotalCost;
                }
            }

            var lastDest = orderedDestinations.Last();
            var lastDestDistance = HaversineKm(lastDest.Latitude, lastDest.Longitude,
                request.UserLocation.Latitude, request.UserLocation.Longitude);
            bool returnUseIntercity = lastDestDistance >= FirstMileIntercityThresholdKm;

            IntercityTransportDto returnTransport;
            if (returnUseIntercity)
            {
                var returnReq = new FixedIntercitySearchRequest(
                    null, lastDest.Latitude, lastDest.Longitude,
                    null, request.UserLocation.Latitude, request.UserLocation.Longitude,
                    request.EndDate, null, 1, 5);
                returnTransport = await BuildIntercityTransportAsync(
                    new GeoPoint(lastDest.Name, lastDest.Latitude, lastDest.Longitude), userGeo,
                    groupSize, transportModes, returnReq, transitHubs, lastDest.Id, userProvinceId, request.EndDate, toMoney, cancellationToken);
            }
            else
            {
                var localDto = await BuildLocalTransportAsync(
                    new GeoPoint(lastDest.Name, lastDest.Latitude, lastDest.Longitude), userGeo,
                    groupSize, transportModes, toMoney, cancellationToken);
                returnTransport = new IntercityTransportDto(
                    lastDest.Id, userProvinceId, localDto.DistanceKm,
                    localDto.SelectedMethod, localDto.SelectedTravelTimeMinutes, toMoney(localDto.SelectedTotalCost),
                    localDto.TransportOptions);
            }
            totalTransportBudget += returnTransport.SelectedTotalCost.BaseAmount;

            // Accommodation (only if HotelPreference is set)
            var hotelsByProvince = destinationProvinces.ToDictionary(
                p => p.Id, p => accommodations.Where(a => a.ProvinceId == p.Id).ToList());

            decimal totalAccommodationBudget = 0m;
            var selectedAccommodations = new Dictionary<int, Location>();
            var accommodationRecommendations = new List<AccommodationRecommendationDto>();

            if (hasHotelPreference)
            {
                foreach (var prov in orderedDestinations)
                {
                    var provHotels = hotelsByProvince.GetValueOrDefault(prov.Id) ?? new List<Location>();
                    var provAttractions = scoredByProvince.GetValueOrDefault(prov.Id) ?? new List<ScoredLocation>();
                    int nights = Math.Max(1, dayAllocation[prov.Id] - 1);
                    var isFirstDest = prov.Id == orderedDestinations[0].Id;
                    var checkInTime = isFirstDest ? FirstDayCheckInTime : TransferDayCheckInTime;

                    var (hotel, recommendations) = SelectAndScoreAccommodation(
                        provHotels, provAttractions, groupSize,
                        usableBudget / totalDays, request.HotelPreference!, prov,
                        nights, checkInTime, toMoney);

                    accommodationRecommendations.AddRange(recommendations);
                    if (hotel is not null)
                    {
                        selectedAccommodations[prov.Id] = hotel;
                        totalAccommodationBudget += GetPerPersonPrice(hotel) * groupSize * nights;
                    }
                }
            }

            var activityBudget = usableBudget - totalTransportBudget - totalAccommodationBudget;
            if (activityBudget < 0) activityBudget = usableBudget * ActivityBudgetFallbackRatio;

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
                var destAccommodation = hasHotelPreference
                    ? selectedAccommodations.GetValueOrDefault(currentProvince.Id) : null;

                for (int localDay = 0; localDay < daysInDest; localDay++)
                {
                    var date = request.StartDate.AddDays(globalDayIndex);
                    var dayNumber = globalDayIndex + 1;
                    var timeline = new List<ItineraryTimelineItemDto>();
                    var travelLegs = new List<TravelLegDto>();
                    var dayTransportCost = 0m;
                    var dayAccommodationCost = 0m;
                    var dayActivityCost = 0m;

                    var dayWeight = dayWeights.GetValueOrDefault(dayNumber, DayWeightDefault);
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

                    var currentTime = date.ToDateTime(DayStartTime);
                    var dayEndTime = date.ToDateTime(DayEndTime);
                    GeoPoint currentPoint;
                    bool lunchInserted = false;
                    bool dinnerInserted = false;

                    // === Day 1: Outbound transfer -> Hub -> Hotel (if pref) -> Attractions ===
                    if (globalDayIndex == 0)
                    {
                        var arrivalTime = AddMinutes(currentTime, intercityTransport.SelectedTravelTimeMinutes);

                        travelLegs.Add(new TravelLegDto(
                            userProvinceId, firstDest.Id,
                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(arrivalTime),
                            intercityTransport.DistanceKm, intercityTransport.SelectedMethod,
                            intercityTransport.SelectedTravelTimeMinutes, intercityTransport.SelectedTotalCost,
                            intercityTransport.TransportOptions));

                        timeline.Add(new ItineraryTimelineItemDto("intercity-transfer",
                            $"Di chuyen tu tinh {userProvinceId} den tinh {firstDest.Id}",
                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(arrivalTime),
                            0, 0, new List<int>(), toMoney(0), toMoney(0), toMoney(0), "Intercity transport"));

                        dayTransportCost += intercityTransport.SelectedTotalCost.BaseAmount;
                        currentTime = AddMinutes(arrivalTime, BufferAfterArrivalMinutes);
                        currentPoint = firstDestGeo;

                        // Hotel check-in (if HotelPreference set)
                        if (destAccommodation is not null)
                        {
                            var checkInStart = Max(currentTime, date.ToDateTime(FirstDayCheckInTime));
                            var checkInEnd = AddMinutes(checkInStart, CheckInDurationMinutes);
                            var accPerPerson = GetPerPersonPrice(destAccommodation);
                            var accGroupCost = accPerPerson * groupSize;
                            timeline.Add(new ItineraryTimelineItemDto("check-in",
                                $"Nhan phong tai {destAccommodation.Name} - Gui hanh ly",
                                TimeOnly.FromDateTime(checkInStart), TimeOnly.FromDateTime(checkInEnd),
                                destAccommodation.Id, destAccommodation.LocationTypeId,
                                destAccommodation.Tags.Select(t => t.Id).ToList(),
                                toMoney(accPerPerson), toMoney(0), toMoney(0), "Nhan phong va gui hanh ly"));
                            dayAccommodationCost += accGroupCost;
                            currentTime = AddMinutes(checkInEnd, BufferAfterCheckInMinutes);
                            currentPoint = GeoPoint.FromLocation(destAccommodation);
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
                            var checkoutEnd = AddMinutes(currentTime, CheckInDurationMinutes);
                            timeline.Add(new ItineraryTimelineItemDto("check-out",
                                $"Tra phong tai {prevAccom.Name} - Nhan hanh ly",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(checkoutEnd),
                                prevAccom.Id, prevAccom.LocationTypeId,
                                prevAccom.Tags.Select(t => t.Id).ToList(),
                                toMoney(0), toMoney(0), toMoney(0), "Tra phong va nhan hanh ly"));
                            currentTime = AddMinutes(checkoutEnd, BufferAfterCheckInMinutes);
                        }

                        var segTransport = interDestTransports[destIdx - 1];

                        travelLegs.Add(new TravelLegDto(
                            prevProvince.Id, currentProvince.Id,
                            TimeOnly.FromDateTime(currentTime),
                            TimeOnly.FromDateTime(AddMinutes(currentTime, segTransport.SelectedTravelTimeMinutes)),
                            segTransport.DistanceKm, segTransport.SelectedMethod,
                            segTransport.SelectedTravelTimeMinutes, segTransport.SelectedTotalCost,
                            segTransport.TransportOptions));

                        timeline.Add(new ItineraryTimelineItemDto("intercity-transfer",
                            $"Di chuyen tu tinh {prevProvince.Id} den tinh {currentProvince.Id}",
                            TimeOnly.FromDateTime(currentTime),
                            TimeOnly.FromDateTime(AddMinutes(currentTime, segTransport.SelectedTravelTimeMinutes)),
                            0, 0, new List<int>(), toMoney(0), toMoney(0), toMoney(0), "Di chuyen lien tinh"));

                        dayTransportCost += segTransport.SelectedTotalCost.BaseAmount;
                        currentTime = AddMinutes(currentTime, segTransport.SelectedTravelTimeMinutes + BufferAfterArrivalMinutes);

                        if (destAccommodation is not null)
                        {
                            var checkInStart = Max(currentTime, date.ToDateTime(TransferDayCheckInTime));
                            var checkInEnd = AddMinutes(checkInStart, CheckInDurationMinutes);
                            var accPerPerson = GetPerPersonPrice(destAccommodation);
                            var accGroupCost = accPerPerson * groupSize;
                            timeline.Add(new ItineraryTimelineItemDto("check-in",
                                $"Nhan phong tai {destAccommodation.Name} - Gui hanh ly",
                                TimeOnly.FromDateTime(checkInStart), TimeOnly.FromDateTime(checkInEnd),
                                destAccommodation.Id, destAccommodation.LocationTypeId,
                                destAccommodation.Tags.Select(t => t.Id).ToList(),
                                toMoney(accPerPerson), toMoney(0), toMoney(0), "Nhan phong va gui hanh ly"));
                            dayAccommodationCost += accGroupCost;
                            currentTime = AddMinutes(checkInEnd, BufferAfterCheckInMinutes);
                        }

                        currentPoint = destAccommodation is not null
                            ? GeoPoint.FromLocation(destAccommodation)
                            : new GeoPoint(currentProvince.Name, currentProvince.Latitude, currentProvince.Longitude);
                    }
                    // === Normal day (same destination) ===
                    else
                    {
                        currentPoint = destAccommodation is not null
                            ? GeoPoint.FromLocation(destAccommodation)
                            : new GeoPoint(currentProvince.Name, currentProvince.Latitude, currentProvince.Longitude);

                        if (destAccommodation is not null && localDay > 0)
                        {
                            var checkoutEnd = AddMinutes(currentTime, LuggageRefreshMinutes);
                            timeline.Add(new ItineraryTimelineItemDto("luggage-refresh",
                                $"Gia han / gui hanh ly tai {destAccommodation.Name}",
                                TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(checkoutEnd),
                                destAccommodation.Id, destAccommodation.LocationTypeId,
                                destAccommodation.Tags.Select(t => t.Id).ToList(),
                                toMoney(0), toMoney(0), toMoney(0), "Gia han phong hoac gui hanh ly"));
                            currentTime = AddMinutes(checkoutEnd, BufferAfterCheckInMinutes);
                            dayAccommodationCost += GetPerPersonPrice(destAccommodation) * groupSize;
                        }
                    }

                    // === Greedy Activity Picker with Meal Injection ===
                    int activityCount = 0;
                    var dayOfWeek = date.DayOfWeek;

                    while (activityCount < MaxActivitiesPerDay && currentTime < dayEndTime.AddHours(-1))
                    {
                        var currentTimeOnly = TimeOnly.FromDateTime(currentTime);

                        // Inject Lunch
                        if (!lunchInserted && currentTimeOnly >= LunchStart && currentTimeOnly < LunchEnd)
                        {
                            var mealEnd = date.ToDateTime(LunchEnd);
                            if (mealEnd <= dayEndTime)
                            {
                                var restaurant = PickRestaurantNearby(dayAttractions, currentPoint, visitedLocationIds);
                                var rLoc = restaurant?.Location;
                                timeline.Add(new ItineraryTimelineItemDto("meal",
                                    rLoc is not null ? $"An trua tai {rLoc.Name}" : "An trua",
                                    currentTimeOnly, LunchEnd,
                                    rLoc?.Id ?? 0, rLoc?.LocationTypeId ?? 0,
                                    rLoc?.Tags.Select(t => t.Id).ToList() ?? new List<int>(),
                                    toMoney(0), toMoney(0), toMoney(0), "Bua trua"));
                                currentTime = date.ToDateTime(LunchEnd).AddMinutes(AfterMealBufferMinutes);
                                lunchInserted = true;
                                if (rLoc is not null) currentPoint = GeoPoint.FromLocation(rLoc);
                                continue;
                            }
                        }

                        // Inject Dinner
                        if (!dinnerInserted && currentTimeOnly >= DinnerStart && currentTimeOnly < DinnerEnd)
                        {
                            var mealEnd = date.ToDateTime(DinnerEnd);
                            if (mealEnd <= dayEndTime)
                            {
                                var restaurant = PickRestaurantNearby(dayAttractions, currentPoint, visitedLocationIds);
                                var rLoc = restaurant?.Location;
                                timeline.Add(new ItineraryTimelineItemDto("meal",
                                    rLoc is not null ? $"An toi tai {rLoc.Name}" : "An toi",
                                    currentTimeOnly, DinnerEnd,
                                    rLoc?.Id ?? 0, rLoc?.LocationTypeId ?? 0,
                                    rLoc?.Tags.Select(t => t.Id).ToList() ?? new List<int>(),
                                    toMoney(0), toMoney(0), toMoney(0), "Bua toi"));
                                currentTime = date.ToDateTime(DinnerEnd).AddMinutes(AfterMealBufferMinutes);
                                dinnerInserted = true;
                                if (rLoc is not null) currentPoint = GeoPoint.FromLocation(rLoc);
                                continue;
                            }
                        }

                        // Pick next attraction (avoiding duplicates across all days)
                        var available = dayAttractions.Where(x => !visitedLocationIds.Contains(x.Location.Id)).ToList();
                        if (available.Count == 0) break;

                        var nextAttraction = PickNextAttractionRandomized(
                            available, currentPoint, remainingDayBudget,
                            currentTime, dayEndTime, groupSize, dayOfWeek, request.TripSegment);

                        if (nextAttraction is null) break;

                        var nextPoint = GeoPoint.FromLocation(nextAttraction.Location);
                        var localTransport = await BuildLocalTransportAsync(
                            currentPoint, nextPoint, groupSize, transportModes, toMoney, cancellationToken);

                        var activityArrival = AddMinutes(currentTime, localTransport.SelectedTravelTimeMinutes);
                        var stayMinutes = Math.Clamp(
                            nextAttraction.Location.RecommentDurationsMinutes ?? DefaultStayMinutes,
                            MinStayMinutes, MaxStayMinutes);
                        var activityEnd = AddMinutes(activityArrival, stayMinutes);

                        if (activityEnd > dayEndTime) break;

                        if (!IsOpenAtTime(nextAttraction.Location, dayOfWeek, TimeOnly.FromDateTime(activityArrival)))
                        {
                            visitedLocationIds.Add(nextAttraction.Location.Id);
                            continue;
                        }

                        var ticketPerPerson = nextAttraction.Location.TicketPrice.HasValue
                            ? Convert.ToDecimal(nextAttraction.Location.TicketPrice.Value, CultureInfo.InvariantCulture) : 0m;
                        var extraSpending = EstimateExtraSpending(nextAttraction.Location, request.TripSegment, groupSize);
                        var activityGroupCost = (ticketPerPerson * groupSize) + extraSpending + localTransport.SelectedTotalCost;

                        if (activityGroupCost > remainingDayBudget) break;

                        // Add local travel leg (same province, no hub IDs)
                        travelLegs.Add(new TravelLegDto(
                            currentProvince.Id, currentProvince.Id,
                            TimeOnly.FromDateTime(currentTime), TimeOnly.FromDateTime(activityArrival),
                            localTransport.DistanceKm, localTransport.SelectedMethod,
                            localTransport.SelectedTravelTimeMinutes, toMoney(localTransport.SelectedTotalCost),
                            localTransport.TransportOptions));

                        var extraCostPerPerson = ((nextAttraction.Location.PriceMin ?? 0) + (nextAttraction.Location.PriceMax ?? 0)) / 2m;

                        timeline.Add(new ItineraryTimelineItemDto("visit",
                            $"Tham quan {nextAttraction.Location.Name}",
                            TimeOnly.FromDateTime(activityArrival), TimeOnly.FromDateTime(activityEnd),
                            nextAttraction.Location.Id, nextAttraction.Location.LocationTypeId,
                            nextAttraction.Location.Tags.Select(t => t.Id).ToList(),
                            toMoney(ticketPerPerson), toMoney(extraCostPerPerson),
                            toMoney(extraCostPerPerson * groupSize),
                            $"Score: {nextAttraction.CompositeScore:F1}"));

                        dayTransportCost += localTransport.SelectedTotalCost;
                        dayActivityCost += activityGroupCost - localTransport.SelectedTotalCost;
                        remainingDayBudget -= activityGroupCost;

                        visitedLocationIds.Add(nextAttraction.Location.Id);
                        currentPoint = nextPoint;
                        currentTime = AddMinutes(activityEnd, AfterActivityBufferMinutes);
                        activityCount++;
                    }

                    // Inject dinner if not yet (late day)
                    if (!dinnerInserted && TimeOnly.FromDateTime(currentTime) < DinnerStart)
                    {
                        var restaurant = PickRestaurantNearby(dayAttractions, currentPoint, visitedLocationIds);
                        var rLoc = restaurant?.Location;
                        timeline.Add(new ItineraryTimelineItemDto("meal",
                            rLoc is not null ? $"An toi tai {rLoc.Name}" : "An toi",
                            DinnerStart, DinnerEnd,
                            rLoc?.Id ?? 0, rLoc?.LocationTypeId ?? 0,
                            rLoc?.Tags.Select(t => t.Id).ToList() ?? new List<int>(),
                            toMoney(0), toMoney(0), toMoney(0), "Bua toi"));
                    }

                    // Evening check-in (for mid-trip days that didn't already check in earlier)
                    if (destAccommodation is not null && globalDayIndex > 0 && !(localDay == 0 && destIdx > 0))
                    {
                        var eveningCheckInStart = Max(currentTime, date.ToDateTime(EveningCheckInTime));
                        if (eveningCheckInStart < dayEndTime.AddHours(1))
                        {
                            var ciEnd = AddMinutes(eveningCheckInStart, CheckOutDurationMinutes);
                            timeline.Add(new ItineraryTimelineItemDto("check-in",
                                $"Nhan phong tai {destAccommodation.Name}",
                                TimeOnly.FromDateTime(eveningCheckInStart), TimeOnly.FromDateTime(ciEnd),
                                destAccommodation.Id, destAccommodation.LocationTypeId,
                                destAccommodation.Tags.Select(t => t.Id).ToList(),
                                toMoney(0), toMoney(0), toMoney(0), "Nghi ngoi buoi toi"));
                        }
                    }

                    // Last day: checkout + return leg
                    if (globalDayIndex == totalDays - 1)
                    {
                        if (destAccommodation is not null)
                        {
                            var coStart = Max(currentTime, date.ToDateTime(CheckOutTime));
                            var coEnd = AddMinutes(coStart, CheckOutDurationMinutes);
                            timeline.Add(new ItineraryTimelineItemDto("check-out",
                                $"Tra phong tai {destAccommodation.Name}",
                                TimeOnly.FromDateTime(coStart), TimeOnly.FromDateTime(coEnd),
                                destAccommodation.Id, destAccommodation.LocationTypeId,
                                destAccommodation.Tags.Select(t => t.Id).ToList(),
                                toMoney(0), toMoney(0), toMoney(0), "Tra phong truoc khi ve"));
                            currentTime = AddMinutes(coEnd, BufferAfterCheckInMinutes);
                        }

                        var returnDeparture = Max(currentTime, date.ToDateTime(ReturnDepartureTime));
                        var returnArrival = AddMinutes(returnDeparture, returnTransport.SelectedTravelTimeMinutes);

                        if (returnArrival <= date.ToDateTime(LatestReturnArrivalTime))
                        {
                            travelLegs.Add(new TravelLegDto(
                                currentProvince.Id, userProvinceId,
                                TimeOnly.FromDateTime(returnDeparture), TimeOnly.FromDateTime(returnArrival),
                                returnTransport.DistanceKm, returnTransport.SelectedMethod,
                                returnTransport.SelectedTravelTimeMinutes, returnTransport.SelectedTotalCost,
                                returnTransport.TransportOptions));

                            timeline.Add(new ItineraryTimelineItemDto("return-transfer",
                                $"Ve tu tinh {currentProvince.Id} den tinh {userProvinceId}",
                                TimeOnly.FromDateTime(returnDeparture), TimeOnly.FromDateTime(returnArrival),
                                0, 0, new List<int>(), toMoney(0), toMoney(0), toMoney(0), "Chuyen ve"));
                            dayTransportCost += returnTransport.SelectedTotalCost.BaseAmount;
                        }
                    }

                    // Day summary
                    var daySpent = dayTransportCost + dayAccommodationCost + dayActivityCost;
                    var budgetLeftover = Math.Max(0, limit - dayActivityCost);
                    var nextDayWeight = dayWeights.GetValueOrDefault(dayNumber + 1, DayWeightDefault);
                    var nextDayBase = activityBudget * (decimal)nextDayWeight / (decimal)totalWeight;
                    var nextDayLimit = nextDayBase * BudgetLimitRatio;
                    rolloverBudget = Math.Min(budgetLeftover, nextDayLimit * RolloverMaxRatio);

                    totalTransportCost += dayTransportCost;
                    totalAccommodationCost += dayAccommodationCost;
                    totalActivityCost += dayActivityCost;

                    var weatherSummary = weather is not null
                        ? $"{currentProvince.Name}: {weather.Summary}" : $"{currentProvince.Name}: Khong co du lieu thoi tiet";

                    days.Add(new ItineraryDayDto(dayNumber, date,
                        currentProvince.Id, weatherSummary,
                        toMoney(dailyBudget), toMoney(daySpent), toMoney(rolloverBudget),
                        timeline.OrderBy(x => x.StartTime).ToList(),
                        travelLegs.OrderBy(x => x.DepartureTime).ToList()));

                    globalDayIndex++;
                }
            }

            // STAGE 7: Output Assembly with Currency Conversion
            var estimatedTotal = totalTransportCost + totalAccommodationCost + totalActivityCost;

            var budgetSummary = new BudgetSummaryDto(
                toMoney(request.TotalBudget),
                toMoney(contingencyFund),
                toMoney(usableBudget),
                toMoney(totalTransportCost),
                toMoney(totalAccommodationCost),
                toMoney(totalActivityCost),
                toMoney(estimatedTotal),
                toMoney(usableBudget - estimatedTotal));

            notes.Add($"Contingency fund: {contingencyFund:N0} VND ({contingencyPercent * 100:F0}%).");
            notes.Add($"Usable budget: {usableBudget:N0} VND.");

            return new GeneratedItineraryDto(
                request.UserLocation,
                request.Destinations,
                request.StartDate, request.EndDate,
                groupSize,
                resolvedCurrency,
                budgetSummary,
                intercityTransport,
                accommodationRecommendations,
                days, notes);
        }

        // === WEATHER-BASED SCORING ===

        private static List<ScoredLocation> ApplyWeatherScoring(IList<ScoredLocation> attractions, bool isBadWeather)
        {
            if (!isBadWeather) return attractions.ToList();

            return attractions.Select(sl =>
            {
                bool isIndoor = sl.Location.Tags.Any(t =>
                    IndoorTagKeywords.Any(kw => t.Tittle.Contains(kw, StringComparison.OrdinalIgnoreCase)));
                bool isOutdoor = sl.Location.Tags.Any(t =>
                    OutdoorTagKeywords.Any(kw => t.Tittle.Contains(kw, StringComparison.OrdinalIgnoreCase)));

                double multiplier = 1.0;
                if (isOutdoor && !isIndoor) multiplier = OutdoorBadWeatherMultiplier;
                else if (isIndoor && !isOutdoor) multiplier = IndoorBadWeatherMultiplier;

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
                location.RecommentDurationsMinutes ?? DefaultStayMinutes, MinStayMinutes, MaxStayMinutes);
            var timeEfficiency = Math.Max(0, 100 - (stayMinutes - TimeEfficiencyBase) / TimeEfficiencyDivisor);
            var costEfficiency = Math.Max(0, 100 - (double)GetPerPersonPrice(location) / CostEfficiencyDivisor);

            return quality * QualityWeight + timeEfficiency * TimeEfficiencyWeight + costEfficiency * CostEfficiencyWeight;
        }

        private static double CalculateQualityScore(Location location, HashSet<int> favoriteTagIds)
        {
            double baseQuality = NormalizeScore(location.Score);
            if (favoriteTagIds.Count == 0) return baseQuality;
            int matchCount = location.Tags.Count(t => favoriteTagIds.Contains(t.Id));
            return Math.Min(MaxQualityScore, baseQuality + matchCount * TagMatchBonus);
        }

        // === RANDOMIZED ACTIVITY PICKER (TOP-3) ===

        private static ScoredLocation? PickNextAttractionRandomized(
            IList<ScoredLocation> candidates, GeoPoint currentPoint,
            decimal remainingBudget, DateTime currentTime, DateTime dayEndTime,
            int groupSize, DayOfWeek dayOfWeek, string tripSegment)
        {
            var feasible = new List<(ScoredLocation Location, double DynamicScore)>();

            foreach (var candidate in candidates)
            {
                var loc = candidate.Location;
                double distanceKm = HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude, loc.Latitude, loc.Longitude);
                if (double.IsInfinity(distanceKm) || double.IsNaN(distanceKm) || distanceKm > MaxReasonableDistanceKm) continue;
                double travelMinutes = (distanceKm / DefaultSpeedKmh) * 60.0;
                var arrivalTime = currentTime.AddMinutes(travelMinutes);

                int stayDuration = Math.Clamp(loc.RecommentDurationsMinutes ?? DefaultStayMinutes, MinStayMinutes, MaxStayMinutes);
                var endTime = arrivalTime.AddMinutes(stayDuration);
                if (endTime > dayEndTime) continue;
                if (!IsOpenAtTime(loc, dayOfWeek, TimeOnly.FromDateTime(arrivalTime))) continue;

                decimal ticketPerPerson = loc.TicketPrice.HasValue
                    ? Convert.ToDecimal(loc.TicketPrice.Value, CultureInfo.InvariantCulture) : 0m;
                decimal transportEstimate = (decimal)(distanceKm * LocalTransportCostPerKm) * (int)Math.Ceiling(groupSize / (double)LocalTransportMaxPassengers);
                decimal totalCost = (ticketPerPerson * groupSize) + transportEstimate;
                if (totalCost > remainingBudget) continue;

                double baseScore = candidate.CompositeScore;
                double distanceScore = Math.Max(0, 100 - distanceKm * DistanceScoreMultiplier);
                double remainingMinutes = (dayEndTime - currentTime).TotalMinutes;
                double timeNeeded = travelMinutes + stayDuration;
                double timeEfficiency = Math.Max(0, 100 - (timeNeeded / Math.Max(1, remainingMinutes) * 100));
                double dynamicScore = baseScore * DynamicBaseWeight + distanceScore * DynamicDistanceWeight + timeEfficiency * DynamicTimeWeight;
                feasible.Add((candidate, dynamicScore));
            }

            if (feasible.Count == 0) return null;

            var topCandidates = feasible.OrderByDescending(x => x.DynamicScore).Take(TopCandidateCount).ToList();
            return topCandidates[Random.Shared.Next(topCandidates.Count)].Location;
        }

        // === MEAL / RESTAURANT PICKER ===

        private static ScoredLocation? PickRestaurantNearby(
            IList<ScoredLocation> attractions, GeoPoint currentPoint, HashSet<int> visitedIds)
        {
            var restaurants = attractions
                .Where(x => !visitedIds.Contains(x.Location.Id))
                .Where(x => x.Location.Tags.Any(t =>
                    RestaurantKeywords.Any(kw => t.Tittle.Contains(kw, StringComparison.OrdinalIgnoreCase))) ||
                    x.Location.LocationType.Name.Contains("Restaurant", StringComparison.OrdinalIgnoreCase) ||
                    x.Location.LocationType.Name.Contains("Food", StringComparison.OrdinalIgnoreCase))
                .OrderBy(x => HaversineKmOrMax(currentPoint.Latitude, currentPoint.Longitude, x.Location.Latitude, x.Location.Longitude))
                .Take(TopCandidateCount)
                .ToList();

            if (restaurants.Count == 0) return null;
            return restaurants[Random.Shared.Next(restaurants.Count)];
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

                    var centerLat = attrs.Where(a => a.Latitude.HasValue).Select(a => a.Latitude!.Value).DefaultIfEmpty(dest.Latitude).Average();
                    var centerLon = attrs.Where(a => a.Longitude.HasValue).Select(a => a.Longitude!.Value).DefaultIfEmpty(dest.Longitude).Average();
                    var distance = HaversineKm(currentLat, currentLon, centerLat, centerLon);
                    var score = attrs.Count / (distance + 0.1);

                    if (score > bestScore) { bestScore = score; nextDest = dest; }
                }

                if (nextDest is null) break;
                ordered.Add(nextDest);
                remaining.Remove(nextDest);
                currentLat = nextDest.Latitude;
                currentLon = nextDest.Longitude;
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
            if (totalBudget < ContingencyThreshold1) return ContingencyPercent1;
            if (totalBudget < ContingencyThreshold2) return ContingencyPercent2;
            if (totalBudget < ContingencyThreshold3) return ContingencyPercent3;
            if (totalBudget < ContingencyThreshold4) return ContingencyPercent4;
            return ContingencyPercentDefault;
        }

        private static Dictionary<int, double> CalculateDayWeights(int totalDays)
        {
            var weights = new Dictionary<int, double>();
            for (int day = 1; day <= totalDays; day++)
            {
                double w = day switch { 1 => DayWeight1, 2 => DayWeight2, _ => DayWeightDefault };
                if (day == totalDays && totalDays > 2) w = DayWeightLast;
                weights[day] = w;
            }
            return weights;
        }

        private static (decimal floor, decimal limit) CalculateBudgetBounds(decimal weightedBudget)
            => (weightedBudget * BudgetFloorRatio, weightedBudget * BudgetLimitRatio);

        private static decimal EstimateExtraSpending(Location location, string tripSegment, int groupSize)
        {
            decimal min = location.PriceMin ?? 0;
            decimal max = location.PriceMax ?? 0;

            if (min <= 0 && max <= 0)
            {
                (min, max) = tripSegment switch
                {
                    "Budget" => (ExtraSpendingBudgetMin, ExtraSpendingBudgetMax),
                    "Luxury" => (ExtraSpendingLuxuryMin, ExtraSpendingLuxuryMax),
                    _ => (ExtraSpendingStandardMin, ExtraSpendingStandardMax)
                };
            }

            decimal avg = (min + max) / 2m;
            bool isSpendingCategory = location.Tags.Any(t =>
                SpendingCategoryKeywords.Any(kw => t.Tittle.Contains(kw, StringComparison.OrdinalIgnoreCase)));

            return Math.Round(avg * (isSpendingCategory ? SpendingCategoryMultiplier : 1.0m) * groupSize, 0);
        }

        // === ACCOMMODATION (Only when HotelPreference set) ===

        private static (Location? best, List<AccommodationRecommendationDto> recommendations)
            SelectAndScoreAccommodation(
                IList<Location> hotels, IList<ScoredLocation> attractions,
                int groupSize, decimal dailyBudget, string hotelPreference,
                Province province, int nights, TimeOnly checkInTime,
                Func<decimal, MoneyDto> toMoney)
        {
            if (hotels.Count == 0) return (null, new List<AccommodationRecommendationDto>());

            var (minPrice, maxPrice) = hotelPreference switch
            {
                "Budget" => (0m, HotelBudgetMax),
                "Luxury" => (HotelLuxuryMin, decimal.MaxValue),
                _ => (HotelBudgetMax, HotelLuxuryMin)
            };

            var filtered = hotels.Where(h => { var avg = GetPerPersonPrice(h); return avg >= minPrice && avg <= maxPrice; }).ToList();
            if (filtered.Count == 0) filtered = hotels.ToList();

            var topAttractions = attractions.Take(AccomTopAttractionsCount).ToList();
            double centerLat = topAttractions.Count > 0
                ? topAttractions.Where(a => a.Location.Latitude.HasValue).Select(a => a.Location.Latitude!.Value).DefaultIfEmpty(province.Latitude).Average()
                : province.Latitude;
            double centerLon = topAttractions.Count > 0
                ? topAttractions.Where(a => a.Location.Longitude.HasValue).Select(a => a.Location.Longitude!.Value).DefaultIfEmpty(province.Longitude).Average()
                : province.Longitude;

            var scored = filtered.Select(hotel =>
            {
                double dist = HaversineKmOrMax(hotel.Latitude, hotel.Longitude, centerLat, centerLon);
                double distanceScore = Math.Max(0, 100 - dist * AccomDistanceScoreMultiplier);
                decimal avgPrice = GetPerPersonPrice(hotel);
                double budgetScore = dailyBudget > 0 ? Math.Max(0, 100 - (double)(avgPrice / dailyBudget * 100)) : AccomDefaultBudgetScore;
                double groupScore = hotel.Amenities.Count > 0 ? AccomGroupBaseWithAmenities : AccomGroupBaseWithout;
                double amenitiesScore = Math.Min(100, hotel.Amenities.Count * AccomAmenityScoreMultiplier);
                double totalScore = distanceScore * AccomDistanceWeight + budgetScore * AccomBudgetWeight + groupScore * AccomGroupWeight + amenitiesScore * AccomAmenityWeight;
                return new { Hotel = hotel, Score = totalScore, Distance = dist };
            }).OrderByDescending(x => x.Score).ToList();

            var recommendations = new List<AccommodationRecommendationDto>();
            foreach (var (x, idx) in scored.Take(AccomMaxRecommendations).Select((v, i) => (v, i)))
            {
                var perPerson = GetPerPersonPrice(x.Hotel);
                var totalPerNight = perPerson * groupSize;
                recommendations.Add(new AccommodationRecommendationDto(
                    x.Hotel.Id, x.Hotel.Name, x.Hotel.Address, x.Score,
                    toMoney(perPerson),
                    toMoney(totalPerNight),
                    x.Distance, x.Hotel.Amenities.Count, idx == 0,
                    province.Id, province.Name, nights,
                    checkInTime, CheckOutTime,
                    CheckInDurationMinutes, CheckOutDurationMinutes,
                    "Gui hanh ly tai quay le tan khi check-in. Lien he khach san de gui hanh ly truoc/sau gio nhan-tra phong."));
            }

            return (scored.FirstOrDefault()?.Hotel, recommendations);
        }

        // === INTERCITY TRANSPORT (Bus/Train/Plane with hub resolution, no nulls) ===

        private async Task<IntercityTransportDto> BuildIntercityTransportAsync(
            GeoPoint from, GeoPoint to, int groupSize, IList<TransportMode> transportModes,
            FixedIntercitySearchRequest outboundReq, IList<TransitHubs> transitHubs,
            int fromProvinceId, int toProvinceId, DateOnly departDate,
            Func<decimal, MoneyDto> toMoney, CancellationToken cancellationToken)
        {
            RouteEstimate? routeEstimate = await _routeMatrixService.EstimateAsync(
                from.Latitude, from.Longitude, to.Latitude, to.Longitude, cancellationToken);

            var rawDistance = routeEstimate?.DistanceKm
                ?? HaversineKm(from.Latitude, from.Longitude, to.Latitude, to.Longitude);
            var distanceKm = double.IsInfinity(rawDistance) || double.IsNaN(rawDistance) || rawDistance > MaxReasonableDistanceKm ? FallbackIntercityDistanceKm : rawDistance;
            var fallbackDuration = Math.Max(MinTravelMinutes, (int)Math.Round(distanceKm / DefaultSpeedKmh * 60d));

            var allOptions = new List<TransportOptionDto>();

            // Find nearest transit hubs (never null IDs - use 0 as fallback)
            var fromTrainHub = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 6);
            var toTrainHub = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 6);
            var fromAirport = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 5);
            var toAirport = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 5);
            // Bus has no dedicated transit hubs in DB - fallback: train station > airport > any hub
            var fromBusHub = FindNearestHub(transitHubs, from.Latitude, from.Longitude, 4)
                ?? fromTrainHub ?? fromAirport ?? FindNearestHubAny(transitHubs, from.Latitude, from.Longitude);
            var toBusHub = FindNearestHub(transitHubs, to.Latitude, to.Longitude, 4)
                ?? toTrainHub ?? toAirport ?? FindNearestHubAny(transitHubs, to.Latitude, to.Longitude);

            // 1. Bus search
            try
            {
                var busResult = await _fixedIntercityTransportService.SearchBusAsync(outboundReq, cancellationToken);
                if (busResult.IsSuccess && busResult.RecommendedOption is not null)
                {
                    var opt = busResult.RecommendedOption;
                    var mins = opt.EstimatedTravelMinutes > 0
                        ? opt.EstimatedTravelMinutes : routeEstimate?.DurationMinutes ?? fallbackDuration;
                    var cost = opt.EstimatedTotalCost > 0
                        ? opt.EstimatedTotalCost : GetBusBracketCost(distanceKm);
                    var note = opt.EstimatedTotalCost > 0
                        ? opt.Note : $"{opt.Note} (chi phi mac dinh do API tra ve 0)";
                    allOptions.Add(new TransportOptionDto("Bus", mins, toMoney(cost), false, note,
                        fromBusHub?.Id ?? 0, toBusHub?.Id ?? 0, 1, toMoney(cost * groupSize)));
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
                        var cost = opt.EstimatedTotalCost > 0
                            ? opt.EstimatedTotalCost : GetTrainBracketCost(distanceKm);
                        var note = opt.EstimatedTotalCost > 0
                            ? opt.Note : $"{opt.Note} (chi phi mac dinh do API tra ve 0)";
                        allOptions.Add(new TransportOptionDto("Train", mins, toMoney(cost), false, note,
                            fromTrainHub.Id, toTrainHub.Id, 1, toMoney(cost * groupSize)));
                    }
                }
                catch { /* train search failed */ }
            }

            // 3. Flight search (using IATA codes, distance > FlightMinDistanceKm)
            if (fromAirport is not null && toAirport is not null && distanceKm > FlightMinDistanceKm)
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
                            ? opt.EstimatedTravelMinutes : Math.Max(MinFlightMinutes, (int)Math.Round(distanceKm / PlaneSpeedKmh * 60.0) + PlaneOverheadMinutes);
                        var cost = opt.EstimatedTotalCost > 0
                            ? opt.EstimatedTotalCost : GetPlaneBracketCost(distanceKm);
                        var note = opt.EstimatedTotalCost > 0
                            ? opt.Note : $"{opt.Note} (chi phi mac dinh do API tra ve 0)";
                        allOptions.Add(new TransportOptionDto("Plane", mins, toMoney(cost), false, note,
                            fromAirport.Id, toAirport.Id, 1, toMoney(cost * groupSize)));
                    }
                }
                catch { /* flight search failed */ }
            }

            // Bracket fallbacks for missing transport types
            if (!allOptions.Any(o => o.Method.Equals("Bus", StringComparison.OrdinalIgnoreCase)))
            {
                allOptions.Add(new TransportOptionDto("Bus",
                    routeEstimate?.DurationMinutes ?? fallbackDuration,
                    toMoney(GetBusBracketCost(distanceKm) * groupSize), false,
                    "Estimated pricing (API unavailable)", fromBusHub?.Id ?? 0, toBusHub?.Id ?? 0,
                    1, toMoney(GetBusBracketCost(distanceKm) * groupSize)));
            }
            if (!allOptions.Any(o => o.Method.Equals("Train", StringComparison.OrdinalIgnoreCase)) && distanceKm > TrainMinDistanceKm)
            {
                var trainMins = Math.Max(MinTrainMinutes, (int)Math.Round(distanceKm / TrainSpeedKmh * 60.0));
                allOptions.Add(new TransportOptionDto("Train", trainMins,
                    toMoney(GetTrainBracketCost(distanceKm) * groupSize), false,
                    "Estimated pricing (API unavailable)", fromTrainHub?.Id ?? 0, toTrainHub?.Id ?? 0,
                    1, toMoney(GetTrainBracketCost(distanceKm) * groupSize)));
            }
            if (!allOptions.Any(o => o.Method.Equals("Plane", StringComparison.OrdinalIgnoreCase)) && distanceKm > FlightBracketMinDistanceKm)
            {
                var planeMins = Math.Max(MinFlightMinutes, (int)Math.Round(distanceKm / PlaneSpeedKmh * 60.0) + PlaneOverheadMinutes);
                allOptions.Add(new TransportOptionDto("Plane", planeMins,
                    toMoney(GetPlaneBracketCost(distanceKm) * groupSize), false,
                    "Estimated pricing (API unavailable)", fromAirport?.Id ?? 0, toAirport?.Id ?? 0,
                    1, toMoney(GetPlaneBracketCost(distanceKm) * groupSize)));
            }

            if (allOptions.Count == 0)
            {
                var bracketCost = GetBracketCostPerPerson(distanceKm) * groupSize;
                var bracketMethod = SelectTransportCategory(distanceKm, groupSize);
                allOptions.Add(new TransportOptionDto(bracketMethod,
                    routeEstimate?.DurationMinutes ?? fallbackDuration, toMoney(bracketCost), true,
                    "Estimated pricing (no API results)", 0, 0, 1, toMoney(bracketCost)));
            }

            // Mark best (cheapest with cost > 0) as recommended; fallback to bracket cost if all costs are 0
            var recommended = allOptions
                .OrderBy(o => o.EstimatedTotalCost.BaseAmount > 0 ? o.EstimatedTotalCost.BaseAmount : decimal.MaxValue)
                .First();

            if (recommended.EstimatedTotalCost.BaseAmount <= 0)
            {
                var fallbackCost = GetBracketCostPerPerson(distanceKm) * groupSize;
                var fallbackMethod = SelectTransportCategory(distanceKm, groupSize);
                recommended = new TransportOptionDto(fallbackMethod,
                    routeEstimate?.DurationMinutes ?? fallbackDuration,
                    toMoney(fallbackCost), true,
                    "Chi phi mac dinh (khong tinh duoc tu API)", 0, 0, 1, toMoney(fallbackCost));
                allOptions.Add(recommended);
            }

            var finalOptions = allOptions
                .Select(o => o with { Recommended = ReferenceEquals(o, recommended) })
                .ToList();

            return new IntercityTransportDto(fromProvinceId, toProvinceId, distanceKm,
                recommended.Method, recommended.EstimatedTravelMinutes, recommended.EstimatedTotalCost,
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
            var distanceKm = double.IsInfinity(rawDistance) || double.IsNaN(rawDistance) || rawDistance > MaxReasonableDistanceKm ? FallbackLocalDistanceKm : rawDistance;
            var fallbackDuration = Math.Max(MinTravelMinutes, (int)Math.Round(distanceKm / DefaultSpeedKmh * 60d));

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
                    return new TransportCandidate(x.Name, timeMinutes, decimal.Round(totalCost, 2), score,
                        over > 0 ? "Exceeds recommended distance" : "Within recommended distance", vehicleCount);
                })
                .OrderBy(x => x.RankScore)
                .ToList();

            var inRange = candidates.Where(c => c.Note == "Within recommended distance").ToList();
            if (inRange.Count > 0) candidates = inRange.Concat(candidates.Except(inRange)).ToList();

            if (candidates.Count == 0)
            {
                var unknownOpt = new TransportOptionDto("Unknown", fallbackDuration, toMoney(0), true,
                    "No local transport data available", 0, 0, 1, toMoney(0));
                return new LocalTransportResult(distanceKm, unknownOpt.Method,
                    unknownOpt.EstimatedTravelMinutes, unknownOpt.EstimatedTotalCost.BaseAmount,
                    new List<TransportOptionDto> { unknownOpt });
            }

            var selected = candidates.First();
            var options = candidates.Take(4).Select((x, idx) => new TransportOptionDto(
                x.Method, x.EstimatedTravelMinutes, toMoney(x.EstimatedTotalCost), idx == 0, x.Note, 0, 0,
                x.VehiclesNeeded, toMoney(x.EstimatedTotalCost))).ToList();

            return new LocalTransportResult(distanceKm, selected.Method,
                selected.EstimatedTravelMinutes, selected.EstimatedTotalCost,
                options);
        }

        // === BRACKET COST FALLBACKS ===

        private static decimal GetBracketCostPerPerson(double distanceKm)
        {
            if (distanceKm > 1000) return BracketCost1000PlusKm;
            if (distanceKm > 600) return BracketCost600PlusKm;
            if (distanceKm > 300) return BracketCost300PlusKm;
            if (distanceKm > 150) return BracketCost150PlusKm;
            return BracketCostDefault;
        }

        private static decimal GetBusBracketCost(double distanceKm)
        {
            if (distanceKm > 1000) return BusCost1000PlusKm;
            if (distanceKm > 600) return BusCost600PlusKm;
            if (distanceKm > 300) return BusCost300PlusKm;
            if (distanceKm > 150) return BusCost150PlusKm;
            return BusCostDefault;
        }

        private static decimal GetTrainBracketCost(double distanceKm)
        {
            if (distanceKm > 1000) return TrainCost1000PlusKm;
            if (distanceKm > 600) return TrainCost600PlusKm;
            if (distanceKm > 300) return TrainCost300PlusKm;
            if (distanceKm > 150) return TrainCost150PlusKm;
            return TrainCostDefault;
        }

        private static decimal GetPlaneBracketCost(double distanceKm)
        {
            if (distanceKm > 1000) return PlaneCost1000PlusKm;
            if (distanceKm > 600) return PlaneCost600PlusKm;
            if (distanceKm > 300) return PlaneCost300PlusKm;
            return PlaneCostDefault;
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

        private static string SelectTransportCategory(double distanceKm, int groupSize)
        {
            if (distanceKm > AirplaneCategoryThresholdKm) return "Airplane";
            if (distanceKm > TrainOrPlaneCategoryThresholdKm) return groupSize > AirplaneGroupSizeThreshold ? "Airplane" : "Train";
            if (distanceKm > TrainCategoryThresholdKm) return "Train";
            return "Bus";
        }

        // === PROVINCE RESOLUTION FROM COORDINATES ===

        private static int ResolveProvinceFromCoords(
            double latitude, double longitude, IList<TransitHubs> transitHubs, int fallbackProvinceId)
        {
            if (transitHubs.Count == 0) return fallbackProvinceId;

            var nearest = transitHubs
                .Select(h => new { h.ProvinceId, Distance = HaversineKm(latitude, longitude, h.Latitude, h.Longitude) })
                .OrderBy(h => h.Distance)
                .FirstOrDefault();

            return nearest?.ProvinceId ?? fallbackProvinceId;
        }

        // === SHARED HELPERS ===

        private static string ResolveWeatherLocationFromProvince(Province province, IList<Location> locations)
        {
            var name = locations.Where(x => x.ProvinceId == province.Id)
                .Select(x => x.District?.Province?.Name)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .GroupBy(x => x!, StringComparer.OrdinalIgnoreCase)
                .OrderByDescending(x => x.Count())
                .Select(x => x.Key)
                .FirstOrDefault();
            return !string.IsNullOrWhiteSpace(name) ? name : province.Name;
        }

        private static bool IsAccommodationType(Location location)
        {
            var typeName = location.LocationType.Name;
            return AccommodationTypeKeywords.Any(kw => typeName.Contains(kw, StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsOpenAtTime(Location location, DayOfWeek dayOfWeek, TimeOnly time)
        {
            if (location.OpeningHours.Count == 0) return true;
            int dayNumber = dayOfWeek switch
            {
                DayOfWeek.Monday => 1, DayOfWeek.Tuesday => 2, DayOfWeek.Wednesday => 3,
                DayOfWeek.Thursday => 4, DayOfWeek.Friday => 5, DayOfWeek.Saturday => 6,
                DayOfWeek.Sunday => 7, _ => 1
            };
            var oh = location.OpeningHours.FirstOrDefault(o => o.DayOfWeek == dayNumber);
            if (oh is null) return true;
            var ts = time.ToTimeSpan();
            return ts >= oh.OpenTime && ts <= oh.CloseTime;
        }

        private static decimal GetPerPersonPrice(Location location)
        {
            var min = location.PriceMin ?? 0;
            var max = location.PriceMax ?? 0;
            if (min <= 0 && max <= 0) return 0;
            if (min > 0 && max > 0) return Math.Round((min + max) / 2m, 0);
            return Math.Max(min, max);
        }

        private static double NormalizeScore(decimal score)
        {
            var raw = (double)score;
            if (raw <= 0) return 50;
            if (raw <= 5) return raw * 20;
            if (raw <= 10) return raw * 10;
            return Math.Clamp(raw, 0, 100);
        }

        private static DateTime AddMinutes(DateTime value, int minutes)
        {
            if (minutes < 0) minutes = 0;
            if (minutes > MaxAddMinutes) minutes = MaxAddMinutes;
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

        private sealed record GeoPoint(string DisplayName, double Latitude, double Longitude)
        {
            public static GeoPoint FromLocation(Location location) =>
                new(location.Name, location.Latitude ?? 0d, location.Longitude ?? 0d);
        }

        private sealed record TransportCandidate(
            string Method, int EstimatedTravelMinutes, decimal EstimatedTotalCost,
            double RankScore, string Note, int VehiclesNeeded);

        private sealed record LocalTransportResult(
            double DistanceKm, string SelectedMethod, int SelectedTravelTimeMinutes,
            decimal SelectedTotalCost, IList<TransportOptionDto> TransportOptions);
    }
}
