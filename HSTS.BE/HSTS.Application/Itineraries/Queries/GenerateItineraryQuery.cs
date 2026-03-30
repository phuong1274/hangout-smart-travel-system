using System.Globalization;
using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Itineraries.Queries
{
    public record GenerateItineraryQuery(
        string From,
        string To,
        DateOnly DepartDate,
        DateOnly ReturnDate,
        int Adults,
        int Children,
        int Infants,
        int? MinTravelerAge,
        int? ProvinceId,
        int? DistrictId,
        IList<int>? PreferredLocationTypeIds,
        IList<int>? PreferredTagIds,
        IList<string>? PreferredTags,
        string Cabin = "economy",
        int Page = 1,
        int PageSize = 20) : IRequest<ErrorOr<GeneratedItineraryDto>>;

    public record GeneratedItineraryDto(
        string From,
        string To,
        DateOnly DepartDate,
        DateOnly ReturnDate,
        int GroupSize,
        decimal EstimatedTotalCost,
        decimal EstimatedTransportCost,
        decimal EstimatedAccommodationCost,
        decimal EstimatedActivityCost,
        TransportRecommendationDto IntercityTransport,
        SandboxTravelSearchResult SandboxSearch,
        IList<ItineraryDayDto> Days,
        IList<string> Notes);

    public record ItineraryDayDto(
        int DayNumber,
        DateOnly Date,
        string? WeatherSummary,
        decimal EstimatedDayCost,
        IList<ItineraryTimelineItemDto> Timeline,
        IList<TravelLegDto> TravelLegs);

    public record ItineraryTimelineItemDto(
        string EventType,
        string Title,
        TimeOnly StartTime,
        TimeOnly EndTime,
        int? LocationId,
        string? LocationName,
        decimal CostPerPerson,
        decimal CostForGroup,
        string? Note);

    public record TravelLegDto(
        string FromLocationName,
        string ToLocationName,
        TimeOnly DepartureTime,
        TimeOnly ArrivalTime,
        double DistanceKm,
        string SelectedMethod,
        int SelectedTravelTimeMinutes,
        decimal SelectedTotalCost,
        IList<TransportOptionDto> TransportOptions);

    public record TransportRecommendationDto(
        string From,
        string To,
        double DistanceKm,
        string SelectedMethod,
        int SelectedTravelTimeMinutes,
        decimal SelectedTotalCost,
        IList<TransportOptionDto> TransportOptions,
        string Source);

    public record TransportOptionDto(
        string Method,
        int EstimatedTravelMinutes,
        decimal EstimatedTotalCost,
        bool Recommended,
        string Note);

    public class GenerateItineraryQueryValidator : AbstractValidator<GenerateItineraryQuery>
    {
        public GenerateItineraryQueryValidator()
        {
            RuleFor(x => x.From)
                .NotEmpty()
                .MaximumLength(20)
                .WithMessage("From must be a province code.");
            RuleFor(x => x.To)
                .NotEmpty()
                .MaximumLength(20)
                .WithMessage("To must be a province code.");
            RuleFor(x => x.ReturnDate)
                .GreaterThanOrEqualTo(x => x.DepartDate)
                .WithMessage("ReturnDate must be greater than or equal to DepartDate.");
            RuleFor(x => x.Adults).GreaterThanOrEqualTo(1);
            RuleFor(x => x.Children).GreaterThanOrEqualTo(0);
            RuleFor(x => x.Infants).GreaterThanOrEqualTo(0);
            RuleFor(x => x.MinTravelerAge).GreaterThanOrEqualTo(0).When(x => x.MinTravelerAge.HasValue);
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        }
    }

    public class GenerateItineraryQueryHandler : IRequestHandler<GenerateItineraryQuery, ErrorOr<GeneratedItineraryDto>>
    {
        private const int MinStayMinutes = 45;
        private const int DefaultStayMinutes = 90;

        private readonly IAppDbContext _context;
        private readonly IRouteMatrixService _routeMatrixService;
        private readonly IWeatherAdvisoryService _weatherAdvisoryService;
        private readonly ISandboxTravelSearchService _sandboxTravelSearchService;
        private readonly IFixedIntercityTransportService _fixedIntercityTransportService;

        public GenerateItineraryQueryHandler(
            IAppDbContext context,
            IRouteMatrixService routeMatrixService,
            IWeatherAdvisoryService weatherAdvisoryService,
            ISandboxTravelSearchService sandboxTravelSearchService,
            IFixedIntercityTransportService fixedIntercityTransportService)
        {
            _context = context;
            _routeMatrixService = routeMatrixService;
            _weatherAdvisoryService = weatherAdvisoryService;
            _sandboxTravelSearchService = sandboxTravelSearchService;
            _fixedIntercityTransportService = fixedIntercityTransportService;
        }

        public async Task<ErrorOr<GeneratedItineraryDto>> Handle(GenerateItineraryQuery request, CancellationToken cancellationToken)
        {
            var notes = new List<string>();

            var groupSize = request.Adults + request.Children + request.Infants;
            if (groupSize <= 0)
            {
                return Error.Validation("Itinerary.GroupSize", "Group size must be greater than 0.");
            }

            var totalDays = request.ReturnDate.DayNumber - request.DepartDate.DayNumber + 1;
            if (totalDays <= 0)
            {
                return Error.Validation("Itinerary.Dates", "Trip duration is invalid.");
            }

            var fromProvince = await ResolveProvinceByCodeAsync(request.From, cancellationToken);
            if (fromProvince is null)
            {
                return Error.Validation("Itinerary.From", "From must be a valid province code.");
            }

            var toProvince = await ResolveProvinceByCodeAsync(request.To, cancellationToken);
            if (toProvince is null)
            {
                return Error.Validation("Itinerary.To", "To must be a valid province code.");
            }

            var routeBaseQuery = _context.Locations
                .AsNoTracking()
                .Where(x => x.Score >= 0);

            if (request.DistrictId.HasValue)
            {
                routeBaseQuery = routeBaseQuery.Where(x => x.DistrictId == request.DistrictId.Value);
                notes.Add("Optimized by district filter before loading related data.");
            }
            else if (request.ProvinceId.HasValue)
            {
                routeBaseQuery = routeBaseQuery.Where(x => x.District.ProvinceId == request.ProvinceId.Value);
                notes.Add("Optimized by province filter before loading related data.");
            }
            else
            {
                routeBaseQuery = routeBaseQuery.Where(x => x.District.ProvinceId == toProvince.Id);
                notes.Add($"Optimized by destination province code: {toProvince.Code}.");
            }

            if (request.MinTravelerAge.HasValue)
            {
                routeBaseQuery = routeBaseQuery.Where(x => x.MinimumAge <= request.MinTravelerAge.Value);
            }
            else
            {
                notes.Add("MinTravelerAge was not provided, so age-based filtering was skipped.");
            }

            // Type filter is intentionally applied before tag filter as requested.
            if (request.PreferredLocationTypeIds is { Count: > 0 })
            {
                routeBaseQuery = routeBaseQuery.Where(x => request.PreferredLocationTypeIds.Contains(x.LocationTypeId));
            }

            var locations = await routeBaseQuery
                .Include(x => x.LocationType)
                .Include(x => x.District)
                    .ThenInclude(x => x.Province)
                .ToListAsync(cancellationToken);

            if (locations.Count == 0)
            {
                return Error.NotFound("Itinerary.Location", "No locations match current filters.");
            }

            var preferredTagKeywords = await ResolvePreferredTagKeywordsAsync(request, cancellationToken);
            if (preferredTagKeywords.Count > 0)
            {
                var tagFiltered = locations
                    .Where(x => IsTagMatch(x, preferredTagKeywords))
                    .ToList();

                if (tagFiltered.Count > 0)
                {
                    locations = tagFiltered;
                }
                else
                {
                    notes.Add("Tag filter returned no result, so itinerary falls back to type/location filters only.");
                }
            }

            var accommodations = locations.Where(IsAccommodationType).ToList();
            var attractions = locations.Where(x => !IsAccommodationType(x)).ToList();

            if (attractions.Count == 0)
            {
                return Error.NotFound("Itinerary.Attraction", "No attraction location is available after filtering.");
            }

            var sortedAttractions = attractions
                .Select(x => new ScoredLocation(x, ComputeCompositeScore(x, preferredTagKeywords)))
                .OrderByDescending(x => x.CompositeScore)
                .ToList();

            var selectedAccommodation = SelectAccommodation(accommodations, sortedAttractions);

            var weatherLocation = await ResolveWeatherLocationAsync(request, locations, toProvince.Name, cancellationToken);
            if (!string.IsNullOrWhiteSpace(weatherLocation))
            {
                notes.Add($"Weather advisory is resolved by province/location: {weatherLocation}.");
            }

            var origin = new GeoPoint(fromProvince.Name, fromProvince.Latitude, fromProvince.Longitude);
            var destination = new GeoPoint(toProvince.Name, toProvince.Latitude, toProvince.Longitude);

            var transportModes = await _context.TransportModes
                .AsNoTracking()
                .Include(x => x.LocalTransportMetrics)
                .ToListAsync(cancellationToken);

            if (transportModes.Count == 0)
            {
                return Error.NotFound("Itinerary.TransportModes", "No transport mode metrics were found.");
            }

            var outboundIntercityRequest = new FixedIntercitySearchRequest(
                null,
                fromProvince.Latitude,
                fromProvince.Longitude,
                null,
                toProvince.Latitude,
                toProvince.Longitude,
                request.DepartDate,
                null,
                request.Page,
                request.PageSize);

            var intercityTransport = await BuildTransportRecommendationAsync(
                origin,
                destination,
                groupSize,
                transportModes,
                useExternalRouteApi: true,
                outboundIntercityRequest,
                cancellationToken);

            var sandboxSearch = await _sandboxTravelSearchService.SearchAsync(
                new SandboxTravelSearchRequest(
                    request.From,
                    request.To,
                    request.DepartDate,
                    request.ReturnDate,
                    request.Cabin,
                    request.Adults,
                    request.Children,
                    request.Infants,
                    request.Page,
                    request.PageSize),
                cancellationToken);

            if (!sandboxSearch.IsSuccess && !string.IsNullOrWhiteSpace(sandboxSearch.ErrorMessage))
            {
                notes.Add($"Sandbox travel API: {sandboxSearch.ErrorMessage}");
            }

            var visitedAttractionIds = new HashSet<int>();
            var days = new List<ItineraryDayDto>();

            decimal totalTransportCost = 0m;
            decimal totalAccommodationCost = 0m;
            decimal totalActivityCost = 0m;

            for (var dayIndex = 0; dayIndex < totalDays; dayIndex++)
            {
                var date = request.DepartDate.AddDays(dayIndex);
                var timeline = new List<ItineraryTimelineItemDto>();
                var travelLegs = new List<TravelLegDto>();
                var dayTransportCost = 0m;
                var dayAccommodationCost = 0m;
                var dayActivityCost = 0m;

                var weather = await _weatherAdvisoryService.GetAdviceAsync(weatherLocation, date, cancellationToken);
                if (weather is { IsOutdoorFriendly: false })
                {
                    notes.Add($"{date:yyyy-MM-dd}: weather in {weatherLocation} suggests reducing outdoor activities.");
                }

                var currentTime = date.ToDateTime(new TimeOnly(6, 30));
                var dayEndTime = date.ToDateTime(new TimeOnly(23, 0));

                GeoPoint currentPoint;

                if (dayIndex == 0)
                {
                    var intercityArrival = AddMinutes(currentTime, intercityTransport.SelectedTravelTimeMinutes);

                    travelLegs.Add(new TravelLegDto(
                        origin.DisplayName,
                        destination.DisplayName,
                        TimeOnly.FromDateTime(currentTime),
                        TimeOnly.FromDateTime(intercityArrival),
                        intercityTransport.DistanceKm,
                        intercityTransport.SelectedMethod,
                        intercityTransport.SelectedTravelTimeMinutes,
                        intercityTransport.SelectedTotalCost,
                        intercityTransport.TransportOptions));

                    timeline.Add(new ItineraryTimelineItemDto(
                        "intercity-transfer",
                        $"Move from {origin.DisplayName} to {destination.DisplayName}",
                        TimeOnly.FromDateTime(currentTime),
                        TimeOnly.FromDateTime(intercityArrival),
                        null,
                        destination.DisplayName,
                        0,
                        intercityTransport.SelectedTotalCost,
                        "Intercity transport recommendation"));

                    dayTransportCost += intercityTransport.SelectedTotalCost;
                    currentTime = AddMinutes(intercityArrival, 20);
                    currentPoint = destination;

                    if (selectedAccommodation is not null)
                    {
                        var checkInStart = Max(currentTime, date.ToDateTime(new TimeOnly(13, 0)));
                        var checkInEnd = AddMinutes(checkInStart, 20);
                        var accommodationPerPerson = GetPerPersonPrice(selectedAccommodation);
                        var accommodationGroupCost = accommodationPerPerson * groupSize;

                        timeline.Add(new ItineraryTimelineItemDto(
                            "check-in",
                            $"Check-in at {selectedAccommodation.Name}",
                            TimeOnly.FromDateTime(checkInStart),
                            TimeOnly.FromDateTime(checkInEnd),
                            selectedAccommodation.Id,
                            selectedAccommodation.Name,
                            accommodationPerPerson,
                            accommodationGroupCost,
                            "Accommodation price is calculated per person"));

                        dayAccommodationCost += accommodationGroupCost;
                        currentTime = AddMinutes(checkInEnd, 10);
                        currentPoint = GeoPoint.FromLocation(selectedAccommodation);
                    }
                }
                else
                {
                    currentPoint = selectedAccommodation is null
                        ? destination
                        : GeoPoint.FromLocation(selectedAccommodation);

                    if (selectedAccommodation is not null)
                    {
                        var checkoutStart = date.ToDateTime(new TimeOnly(6, 30));
                        var checkoutEnd = AddMinutes(checkoutStart, 15);

                        timeline.Add(new ItineraryTimelineItemDto(
                            "check-out",
                            $"Check-out from {selectedAccommodation.Name}",
                            TimeOnly.FromDateTime(checkoutStart),
                            TimeOnly.FromDateTime(checkoutEnd),
                            selectedAccommodation.Id,
                            selectedAccommodation.Name,
                            0,
                            0,
                            "Auto-added checkout event for accommodation flow"));

                        currentTime = AddMinutes(checkoutEnd, 10);
                    }
                }

                while (currentTime < dayEndTime.AddHours(-1))
                {
                    var available = sortedAttractions
                        .Where(x => !visitedAttractionIds.Contains(x.Location.Id))
                        .ToList();

                    if (available.Count == 0)
                    {
                        break;
                    }

                    var nextAttraction = PickNextAttraction(available, currentPoint);
                    var nextPoint = GeoPoint.FromLocation(nextAttraction.Location);

                    var localTransport = await BuildTransportRecommendationAsync(
                        currentPoint,
                        nextPoint,
                        groupSize,
                        transportModes,
                        useExternalRouteApi: false,
                        null,
                        cancellationToken);

                    var activityArrival = AddMinutes(currentTime, localTransport.SelectedTravelTimeMinutes);
                    var stayMinutes = Math.Clamp(
                        nextAttraction.Location.RecommentDurationsMinutes ?? DefaultStayMinutes,
                        MinStayMinutes,
                        240);
                    var activityEnd = AddMinutes(activityArrival, stayMinutes);

                    if (activityEnd > dayEndTime)
                    {
                        break;
                    }

                    travelLegs.Add(new TravelLegDto(
                        currentPoint.DisplayName,
                        nextAttraction.Location.Name,
                        TimeOnly.FromDateTime(currentTime),
                        TimeOnly.FromDateTime(activityArrival),
                        localTransport.DistanceKm,
                        localTransport.SelectedMethod,
                        localTransport.SelectedTravelTimeMinutes,
                        localTransport.SelectedTotalCost,
                        localTransport.TransportOptions));

                    var activityPerPersonCost = GetPerPersonPrice(nextAttraction.Location);
                    var ticketPerPerson = nextAttraction.Location.TicketPrice.HasValue
                        ? Convert.ToDecimal(nextAttraction.Location.TicketPrice.Value, CultureInfo.InvariantCulture)
                        : 0m;
                    var activityTotalPerPerson = activityPerPersonCost + ticketPerPerson;
                    var activityGroupCost = activityTotalPerPerson * groupSize;

                    timeline.Add(new ItineraryTimelineItemDto(
                        "visit",
                        $"Visit {nextAttraction.Location.Name}",
                        TimeOnly.FromDateTime(activityArrival),
                        TimeOnly.FromDateTime(activityEnd),
                        nextAttraction.Location.Id,
                        nextAttraction.Location.Name,
                        activityTotalPerPerson,
                        activityGroupCost,
                        "Location price is calculated per person"));

                    dayTransportCost += localTransport.SelectedTotalCost;
                    dayActivityCost += activityGroupCost;

                    visitedAttractionIds.Add(nextAttraction.Location.Id);
                    currentPoint = nextPoint;
                    currentTime = AddMinutes(activityEnd, 15);
                }

                if (selectedAccommodation is not null && dayIndex > 0)
                {
                    var eveningCheckInStart = Max(currentTime, date.ToDateTime(new TimeOnly(21, 0)));
                    if (eveningCheckInStart < dayEndTime)
                    {
                        var eveningCheckInEnd = AddMinutes(eveningCheckInStart, 20);
                        var accommodationPerPerson = GetPerPersonPrice(selectedAccommodation);
                        var accommodationGroupCost = accommodationPerPerson * groupSize;

                        timeline.Add(new ItineraryTimelineItemDto(
                            "check-in",
                            $"Check-in at {selectedAccommodation.Name}",
                            TimeOnly.FromDateTime(eveningCheckInStart),
                            TimeOnly.FromDateTime(eveningCheckInEnd),
                            selectedAccommodation.Id,
                            selectedAccommodation.Name,
                            accommodationPerPerson,
                            accommodationGroupCost,
                            "Auto-added evening check-in for daily rest"));

                        dayAccommodationCost += accommodationGroupCost;
                    }
                }

                if (dayIndex == totalDays - 1)
                {
                    var returnIntercityRequest = new FixedIntercitySearchRequest(
                        null,
                        currentPoint.Latitude,
                        currentPoint.Longitude,
                        null,
                        origin.Latitude,
                        origin.Longitude,
                        date,
                        null,
                        request.Page,
                        request.PageSize);

                    var returnTransport = await BuildTransportRecommendationAsync(
                        currentPoint,
                        origin,
                        groupSize,
                        transportModes,
                        useExternalRouteApi: true,
                        returnIntercityRequest,
                        cancellationToken);

                    var returnDeparture = Max(currentTime, date.ToDateTime(new TimeOnly(17, 0)));
                    var returnArrival = AddMinutes(returnDeparture, returnTransport.SelectedTravelTimeMinutes);

                    if (returnArrival <= date.ToDateTime(new TimeOnly(23, 59)))
                    {
                        travelLegs.Add(new TravelLegDto(
                            currentPoint.DisplayName,
                            origin.DisplayName,
                            TimeOnly.FromDateTime(returnDeparture),
                            TimeOnly.FromDateTime(returnArrival),
                            returnTransport.DistanceKm,
                            returnTransport.SelectedMethod,
                            returnTransport.SelectedTravelTimeMinutes,
                            returnTransport.SelectedTotalCost,
                            returnTransport.TransportOptions));

                        timeline.Add(new ItineraryTimelineItemDto(
                            "return-transfer",
                            $"Return from {currentPoint.DisplayName} to {origin.DisplayName}",
                            TimeOnly.FromDateTime(returnDeparture),
                            TimeOnly.FromDateTime(returnArrival),
                            null,
                            origin.DisplayName,
                            0,
                            returnTransport.SelectedTotalCost,
                            "Return leg recommendation"));

                        dayTransportCost += returnTransport.SelectedTotalCost;
                    }
                }

                totalTransportCost += dayTransportCost;
                totalAccommodationCost += dayAccommodationCost;
                totalActivityCost += dayActivityCost;

                days.Add(new ItineraryDayDto(
                    dayIndex + 1,
                    date,
                    weather is null ? null : $"{weatherLocation}: {weather.Summary}",
                    dayTransportCost + dayAccommodationCost + dayActivityCost,
                    timeline.OrderBy(x => x.StartTime).ToList(),
                    travelLegs.OrderBy(x => x.DepartureTime).ToList()));
            }

            var output = new GeneratedItineraryDto(
                request.From,
                request.To,
                request.DepartDate,
                request.ReturnDate,
                groupSize,
                totalTransportCost + totalAccommodationCost + totalActivityCost,
                totalTransportCost,
                totalAccommodationCost,
                totalActivityCost,
                intercityTransport,
                sandboxSearch,
                days,
                notes);

            return output;
        }

        private async Task<string> ResolveWeatherLocationAsync(
            GenerateItineraryQuery request,
            IList<Location> locations,
            string defaultLocation,
            CancellationToken cancellationToken)
        {
            if (request.ProvinceId.HasValue)
            {
                var provinceName = await _context.Provinces
                    .AsNoTracking()
                    .Where(x => x.Id == request.ProvinceId.Value)
                    .Select(x => x.Name)
                    .FirstOrDefaultAsync(cancellationToken);

                if (!string.IsNullOrWhiteSpace(provinceName))
                {
                    return provinceName.Trim();
                }
            }

            if (request.DistrictId.HasValue)
            {
                var districtProvinceName = await _context.Districts
                    .AsNoTracking()
                    .Where(x => x.Id == request.DistrictId.Value && x.ProvinceId.HasValue)
                    .Select(x => x.Province.Name)
                    .FirstOrDefaultAsync(cancellationToken);

                if (!string.IsNullOrWhiteSpace(districtProvinceName))
                {
                    return districtProvinceName.Trim();
                }
            }

            var mostCommonProvince = locations
                .Select(x => x.District?.Province?.Name)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!.Trim())
                .GroupBy(x => x, StringComparer.OrdinalIgnoreCase)
                .OrderByDescending(x => x.Count())
                .ThenBy(x => x.Key.Length)
                .Select(x => x.Key)
                .FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(mostCommonProvince))
            {
                return mostCommonProvince;
            }

            return string.IsNullOrWhiteSpace(defaultLocation)
                ? "Ha Noi"
                : defaultLocation.Trim();
        }

        private async Task<Province?> ResolveProvinceByCodeAsync(string provinceCode, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(provinceCode))
            {
                return null;
            }

            var normalized = provinceCode.Trim().ToUpperInvariant();

            return await _context.Provinces
                .AsNoTracking()
                .Where(x => x.Code.ToUpper() == normalized)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private async Task<List<string>> ResolvePreferredTagKeywordsAsync(
            GenerateItineraryQuery request,
            CancellationToken cancellationToken)
        {
            var result = new List<string>();

            if (request.PreferredTags is { Count: > 0 })
            {
                result.AddRange(request.PreferredTags.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()));
            }

            if (request.PreferredTagIds is { Count: > 0 })
            {
                var fromDb = await _context.Tags
                    .AsNoTracking()
                    .Where(x => request.PreferredTagIds.Contains(x.Id))
                    .Select(x => x.Tittle)
                    .ToListAsync(cancellationToken);

                result.AddRange(fromDb.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()));
            }

            return result
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static bool IsTagMatch(Location location, IEnumerable<string> keywords)
        {
            var searchable = $"{location.Name} {location.Description} {location.LocationType.Name}";
            return keywords.Any(tag => searchable.Contains(tag, StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsAccommodationType(Location location)
        {
            var typeName = location.LocationType.Name.ToLowerInvariant();
            return typeName.Contains("hotel")
                || typeName.Contains("resort")
                || typeName.Contains("homestay")
                || typeName.Contains("hostel")
                || typeName.Contains("guesthouse")
                || typeName.Contains("accommodation")
                || typeName.Contains("khach san")
                || typeName.Contains("nha nghi")
                || typeName.Contains("cho nghi");
        }

        private static Location? SelectAccommodation(
            IList<Location> accommodations,
            IList<ScoredLocation> scoredAttractions)
        {
            if (accommodations.Count == 0)
            {
                return null;
            }

            var target = scoredAttractions.FirstOrDefault()?.Location;
            if (target is null)
            {
                return accommodations
                    .OrderBy(x => GetPerPersonPrice(x))
                    .ThenByDescending(x => x.Score)
                    .First();
            }

            return accommodations
                .OrderBy(x => HaversineKm(x.Latitude, x.Longitude, target.Latitude, target.Longitude))
                .ThenBy(x => GetPerPersonPrice(x))
                .ThenByDescending(x => x.Score)
                .First();
        }

        private static ScoredLocation PickNextAttraction(
            IList<ScoredLocation> candidates,
            GeoPoint currentPoint)
        {
            return candidates
                .OrderByDescending(x => x.CompositeScore - HaversineKm(currentPoint.Latitude, currentPoint.Longitude, x.Location.Latitude, x.Location.Longitude) * 1.2)
                .First();
        }

        private async Task<TransportRecommendationDto> BuildTransportRecommendationAsync(
            GeoPoint from,
            GeoPoint to,
            int groupSize,
            IList<TransportMode> transportModes,
            bool useExternalRouteApi,
            FixedIntercitySearchRequest? fixedIntercityRequest,
            CancellationToken cancellationToken)
        {
            RouteEstimate? routeEstimate = null;

            if (useExternalRouteApi)
            {
                routeEstimate = await _routeMatrixService.EstimateAsync(from.DisplayName, to.DisplayName, cancellationToken)
                    ?? await _routeMatrixService.EstimateAsync(from.Latitude, from.Longitude, to.Latitude, to.Longitude, cancellationToken);
            }

            var distanceKm = routeEstimate?.DistanceKm
                ?? HaversineKm(from.Latitude, from.Longitude, to.Latitude, to.Longitude);
            var fallbackDuration = Math.Max(10, (int)Math.Round(distanceKm / 35d * 60d));

            if (useExternalRouteApi)
            {
                if (fixedIntercityRequest is not null)
                {
                    var busResult = await _fixedIntercityTransportService.SearchBusAsync(fixedIntercityRequest, cancellationToken);
                    if (busResult.IsSuccess && busResult.RecommendedOption is not null)
                    {
                        var busOption = busResult.RecommendedOption;
                        var intercityMinutes = busOption.EstimatedTravelMinutes > 0
                            ? busOption.EstimatedTravelMinutes
                            : routeEstimate?.DurationMinutes ?? fallbackDuration;

                        var selectedOption = new TransportOptionDto(
                            busOption.Method,
                            intercityMinutes,
                            busOption.EstimatedTotalCost,
                            true,
                            busOption.Note);

                        return new TransportRecommendationDto(
                            from.DisplayName,
                            to.DisplayName,
                            distanceKm,
                            selectedOption.Method,
                            selectedOption.EstimatedTravelMinutes,
                            selectedOption.EstimatedTotalCost,
                            new List<TransportOptionDto> { selectedOption },
                            busResult.Source);
                    }

                    var fallbackBusOption = new TransportOptionDto(
                        "Bus",
                        routeEstimate?.DurationMinutes ?? fallbackDuration,
                        0,
                        true,
                        busResult.ErrorMessage ?? "Bus API did not return a parsable option.");

                    return new TransportRecommendationDto(
                        from.DisplayName,
                        to.DisplayName,
                        distanceKm,
                        fallbackBusOption.Method,
                        fallbackBusOption.EstimatedTravelMinutes,
                        fallbackBusOption.EstimatedTotalCost,
                        new List<TransportOptionDto> { fallbackBusOption },
                        busResult.Source);
                }

                var pendingOption = new TransportOptionDto(
                    "FixedIntercity",
                    routeEstimate?.DurationMinutes ?? fallbackDuration,
                    0,
                    true,
                    "FixedIntercity will use external API and is not integrated yet.");

                return new TransportRecommendationDto(
                    from.DisplayName,
                    to.DisplayName,
                    distanceKm,
                    pendingOption.Method,
                    pendingOption.EstimatedTravelMinutes,
                    pendingOption.EstimatedTotalCost,
                    new List<TransportOptionDto> { pendingOption },
                    routeEstimate?.Source ?? "fixed-intercity-pending");
            }

            var candidates = transportModes
                .Where(x => x.Category == CategoryTransport.DynamicLocal && x.LocalTransportMetrics is not null)
                .Select(x =>
                {
                    var metrics = x.LocalTransportMetrics!;
                    var speedKmh = Math.Max(1d, (double)metrics.SpeedKmh);
                    var timeMinutes = Math.Max(5, (int)Math.Round(distanceKm / speedKmh * 60d));
                    var totalCost = (decimal)distanceKm * metrics.CostPerKm * groupSize;
                    var overDistance = distanceKm - (double)metrics.MaxRecommendedDistance;
                    var overloadPenalty = overDistance > 0 ? overDistance * 2d : 0d;
                    var score = timeMinutes * 0.55d + (double)totalCost * 0.00035d + overloadPenalty;

                    return new TransportCandidate(
                        x.Name,
                        timeMinutes,
                        Decimal.Round(totalCost, 2),
                        score,
                        overDistance > 0 ? "Beyond recommended distance" : "Within recommended distance");
                })
                .OrderBy(x => x.RankScore)
                .ToList();

            if (candidates.Count == 0)
            {
                var unknownOption = new TransportOptionDto(
                    "Unknown",
                    fallbackDuration,
                    0,
                    true,
                    "No DynamicLocal transport metric data");

                return new TransportRecommendationDto(
                    from.DisplayName,
                    to.DisplayName,
                    distanceKm,
                    unknownOption.Method,
                    unknownOption.EstimatedTravelMinutes,
                    unknownOption.EstimatedTotalCost,
                    new List<TransportOptionDto> { unknownOption },
                        "haversine-fallback");
            }

            var selected = candidates.First();
                    var selectedTravelMinutes = selected.EstimatedTravelMinutes;

            var options = candidates
                .Take(4)
                .Select((x, index) => new TransportOptionDto(
                    x.Method,
                    index == 0 ? selectedTravelMinutes : x.EstimatedTravelMinutes,
                    x.EstimatedTotalCost,
                    index == 0,
                    x.Note))
                .ToList();

            return new TransportRecommendationDto(
                from.DisplayName,
                to.DisplayName,
                distanceKm,
                selected.Method,
                selectedTravelMinutes,
                selected.EstimatedTotalCost,
                options,
                "local-transport-metrics");
        }

        private static decimal GetPerPersonPrice(Location location)
        {
            if (location.PriceMin <= 0 && location.PriceMax <= 0)
            {
                return 0;
            }

            if (location.PriceMin > 0 && location.PriceMax > 0)
            {
                return Decimal.Round((location.PriceMin + location.PriceMax) / 2m, 2);
            }

            return Math.Max(location.PriceMin, location.PriceMax);
        }

        private static double ComputeCompositeScore(Location location, IList<string> preferredTagKeywords)
        {
            var quality = NormalizeScore(location.Score);
            var stayMinutes = Math.Clamp(location.RecommentDurationsMinutes ?? DefaultStayMinutes, MinStayMinutes, 240);
            var timeEfficiency = Math.Max(0, 100 - (stayMinutes - 30) / 3.0);
            var costEfficiency = Math.Max(0, 100 - (double)GetPerPersonPrice(location) / 5000.0);

            var tagMatchCount = preferredTagKeywords.Count(tag => IsTagMatch(location, new[] { tag }));
            var tagBoost = tagMatchCount * 10;

            return quality * 0.40 + timeEfficiency * 0.35 + costEfficiency * 0.25 + tagBoost;
        }

        private static double NormalizeScore(decimal score)
        {
            var raw = (double)score;
            if (raw <= 5)
            {
                raw *= 20;
            }

            return Math.Clamp(raw, 0, 100);
        }

        private static DateTime AddMinutes(DateTime value, int minutes) => value.AddMinutes(minutes);

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

        private static double ToRadians(double degree) => degree * (Math.PI / 180d);

        private sealed record ScoredLocation(Location Location, double CompositeScore);

        private sealed record GeoPoint(string DisplayName, double Latitude, double Longitude)
        {
            public static GeoPoint FromLocation(Location location) =>
                new(location.Name, location.Latitude, location.Longitude);
        }

        private sealed record TransportCandidate(
            string Method,
            int EstimatedTravelMinutes,
            decimal EstimatedTotalCost,
            double RankScore,
            string Note);
    }
}
