using HSTS.Application.Itineraries.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Itineraries.Commands
{
    public record GenerateSmartItineraryCommand(
        IList<int> DestinationProvinceIds,
        int GroupSize,
        decimal TotalBudget,
        DateTime StartDate,
        DateTime EndDate,
        IList<string>? UserFavoriteTags,
        TripSegment HotelPreference,
        TripSegment TripSegment) : IRequest<ErrorOr<SmartItineraryDto>>;

    public class GenerateSmartItineraryCommandValidator : AbstractValidator<GenerateSmartItineraryCommand>
    {
        public GenerateSmartItineraryCommandValidator()
        {
            RuleFor(x => x.DestinationProvinceIds)
                .NotNull()
                .Must(x => x.Count > 0)
                .WithMessage("At least one destination is required.");

            RuleFor(x => x.GroupSize)
                .GreaterThan(0)
                .LessThanOrEqualTo(100);

            RuleFor(x => x.TotalBudget)
                .GreaterThan(0);

            RuleFor(x => x.StartDate)
                .LessThanOrEqualTo(x => x.EndDate);
        }
    }

    public class GenerateSmartItineraryCommandHandler : IRequestHandler<GenerateSmartItineraryCommand, ErrorOr<SmartItineraryDto>>
    {
        private static readonly HashSet<string> AccommodationTags =
            new(new[] { "hotel", "guesthouse", "hostel", "homestay", "accommodation", "resort", "villa" }, StringComparer.OrdinalIgnoreCase);

        private readonly IAppDbContext _context;
        private readonly IInterCityRouteEstimator _routeEstimator;

        public GenerateSmartItineraryCommandHandler(IAppDbContext context, IInterCityRouteEstimator routeEstimator)
        {
            _context = context;
            _routeEstimator = routeEstimator;
        }

        public async Task<ErrorOr<SmartItineraryDto>> Handle(GenerateSmartItineraryCommand request, CancellationToken cancellationToken)
        {
            var destinationIds = request.DestinationProvinceIds
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            if (destinationIds.Count == 0)
            {
                return Error.Validation("Itinerary.Destination.Invalid", "Destination IDs are invalid.");
            }

            var totalDays = (request.EndDate.Date - request.StartDate.Date).Days + 1;
            if (totalDays <= 0)
            {
                return Error.Validation("Itinerary.DateRange.Invalid", "EndDate must be greater than or equal to StartDate.");
            }

            var provinces = await _context.Provinces
                .Where(p => destinationIds.Contains(p.Id) && !p.IsDeleted)
                .ToListAsync(cancellationToken);

            if (provinces.Count != destinationIds.Count)
            {
                return Error.Validation("Itinerary.Destination.NotFound", "One or more destinations do not exist.");
            }

            var provinceById = provinces.ToDictionary(x => x.Id);

            var locations = await _context.Locations
                .Where(x => destinationIds.Contains(x.ProvinceId) && !x.IsDeleted)
                .Include(x => x.LocationTags)
                    .ThenInclude(x => x.Tag)
                .Include(x => x.LocationType)
                .Include(x => x.LocationMedias)
                .Include(x => x.RoomTypes)
                .ToListAsync(cancellationToken);

            var normalizedFavoriteTags = request.UserFavoriteTags?
                .Select(x => x.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.ToLowerInvariant())
                .Distinct()
                .ToHashSet() ?? new HashSet<string>();

            var scoredLocations = locations
                .Select(location => ScoreLocation(location, normalizedFavoriteTags))
                .ToList();

            var attractionsByProvince = scoredLocations
                .Where(x => !IsAccommodationLocation(x.Location))
                .GroupBy(x => x.Location.ProvinceId)
                .ToDictionary(x => x.Key, x => x.OrderByDescending(s => s.Score).ToList());

            var hotelsByProvince = scoredLocations
                .Where(x => IsAccommodationLocation(x.Location))
                .GroupBy(x => x.Location.ProvinceId)
                .ToDictionary(x => x.Key, x => x.OrderByDescending(s => s.Score).ToList());

            var orderedDestinations = OrderDestinationsByAttractionDensity(destinationIds, provinceById, attractionsByProvince);
            var dayDestinations = AllocateDaysToDestinations(orderedDestinations, totalDays, attractionsByProvince);

            var contingencyPercentage = CalculateContingencyPercentage(request.TotalBudget);
            var contingencyFund = RoundMoney(request.TotalBudget * contingencyPercentage);
            var usableBudget = Math.Max(0m, request.TotalBudget - contingencyFund);

            var transfers = new List<InterCityTransportOptionDto>();
            var transferCache = new Dictionary<string, InterCityTransportOptionDto>(StringComparer.OrdinalIgnoreCase);
            decimal transportBudget = 0m;

            for (var i = 1; i < orderedDestinations.Count; i++)
            {
                var from = orderedDestinations[i - 1];
                var to = orderedDestinations[i];
                var cacheKey = $"{from.Id}-{to.Id}-{request.GroupSize}";

                if (!transferCache.TryGetValue(cacheKey, out var transferOption))
                {
                    var estimate = await _routeEstimator.EstimateAsync(from, to, request.GroupSize, cancellationToken);
                    transferOption = new InterCityTransportOptionDto(
                        from.Id,
                        from.Name,
                        to.Id,
                        to.Name,
                        estimate.Method,
                        estimate.Description,
                        estimate.DepartureHub,
                        estimate.ArrivalHub,
                        RoundMoney(estimate.TotalCost),
                        estimate.TravelTimeMinutes,
                        estimate.Pros,
                        estimate.Cons,
                        true,
                        estimate.DistanceKm);

                    transferCache[cacheKey] = transferOption;
                }

                transfers.Add(transferOption);
                transportBudget += transferOption.TotalCost;
            }

            var accommodationBudget = EstimateAccommodationBudget(
                dayDestinations,
                hotelsByProvince,
                request.HotelPreference,
                request.GroupSize);

            var activityBudget = usableBudget - transportBudget - accommodationBudget;
            if (activityBudget < 0m)
            {
                activityBudget = 0m;
            }

            var visitedLocationIds = new HashSet<int>();
            var dayWeights = Enumerable.Range(0, totalDays).Select(i => GetDayWeight(i, totalDays)).ToList();
            var totalDayWeight = dayWeights.Sum();
            var baseDailyBudget = totalDayWeight <= 0 ? 0m : activityBudget / (decimal)totalDayWeight;

            var days = new List<DailyItineraryDto>();
            decimal rolloverIn = 0m;
            decimal estimatedActivitySpendTotal = 0m;

            for (var dayIndex = 0; dayIndex < totalDays; dayIndex++)
            {
                var destination = dayDestinations[Math.Min(dayIndex, dayDestinations.Count - 1)];
                var transferFromPrevious = default(InterCityTransportOptionDto);

                if (dayIndex > 0)
                {
                    var previousDestination = dayDestinations[dayIndex - 1];
                    if (previousDestination.Id != destination.Id)
                    {
                        transferFromPrevious = transfers.FirstOrDefault(x =>
                            x.FromProvinceId == previousDestination.Id && x.ToProvinceId == destination.Id);
                    }
                }

                var weightedDailyBudget = RoundMoney(baseDailyBudget * (decimal)dayWeights[dayIndex] + rolloverIn);
                var floor = RoundMoney(weightedDailyBudget * 0.7m);
                var limit = RoundMoney(weightedDailyBudget * 1.3m);

                var dayPlan = BuildActivitiesForDay(
                    destination,
                    attractionsByProvince,
                    visitedLocationIds,
                    request.GroupSize,
                    request.TripSegment,
                    limit);

                var activities = dayPlan.Activities;
                var travelLegs = dayPlan.TravelLegs;

                var accommodation = BuildAccommodationRecommendation(
                    destination,
                    hotelsByProvince,
                    request.GroupSize,
                    request.HotelPreference,
                    weightedDailyBudget,
                    activities.FirstOrDefault());

                var estimatedSpend = RoundMoney(activities.Sum(x => x.TotalCost));
                estimatedActivitySpendTotal += estimatedSpend;

                var notes = BuildDailyNotes(dayIndex, totalDays, dayDestinations, transferFromPrevious, request.GroupSize);

                var nextDayWeightedBudget = dayIndex + 1 < totalDays
                    ? RoundMoney(baseDailyBudget * (decimal)dayWeights[dayIndex + 1])
                    : 0m;

                var nextDayLimit = RoundMoney(nextDayWeightedBudget * 1.3m);
                var rolloverOut = dayIndex + 1 < totalDays
                    ? decimal.Min(Math.Max(limit - estimatedSpend, 0m), nextDayLimit * 0.5m)
                    : 0m;

                rolloverIn = rolloverOut;

                days.Add(new DailyItineraryDto(
                    dayIndex + 1,
                    DateOnly.FromDateTime(request.StartDate.Date.AddDays(dayIndex)),
                    destination.Id,
                    destination.Name,
                    weightedDailyBudget,
                    floor,
                    limit,
                    estimatedSpend,
                    RoundMoney(rolloverOut),
                    notes,
                    activities,
                    travelLegs,
                    accommodation,
                    transferFromPrevious));
            }

            var budgetSummary = new BudgetSummaryDto(
                RoundMoney(contingencyFund),
                RoundMoney(usableBudget),
                RoundMoney(transportBudget),
                RoundMoney(accommodationBudget),
                RoundMoney(activityBudget),
                RoundMoney(estimatedActivitySpendTotal),
                RoundMoney(request.TotalBudget - contingencyFund - transportBudget - accommodationBudget - estimatedActivitySpendTotal));

            return new SmartItineraryDto(
                RoundMoney(request.TotalBudget),
                budgetSummary,
                days,
                transfers);
        }

        private static List<string> BuildDailyNotes(
            int dayIndex,
            int totalDays,
            IList<Province> dayDestinations,
            InterCityTransportOptionDto? transferFromPrevious,
            int groupSize)
        {
            var notes = new List<string>();

            if (dayIndex == 0)
            {
                notes.Add("08:00 - 08:30 Check-in and luggage drop.");
            }

            if (dayIndex > 0 && dayDestinations[dayIndex - 1].Id != dayDestinations[dayIndex].Id)
            {
                notes.Add("08:00 - 08:30 Check-out from previous accommodation.");
                if (transferFromPrevious is not null)
                {
                    notes.Add(BuildTransportGuidanceNote(transferFromPrevious, groupSize));
                    notes.Add($"Tip: {transferFromPrevious.Pros} Caution: {transferFromPrevious.Cons}");
                }
                notes.Add("Arrival and check-in at new destination before afternoon activities.");
            }
            else
            {
                notes.Add("Local transport guidance: each travel leg now includes transport options so travelers can choose method per movement.");
            }

            if (dayIndex == totalDays - 1)
            {
                notes.Add("Reserve time for souvenirs and checkout preparation.");
            }

            return notes;
        }

        private static string BuildTransportGuidanceNote(InterCityTransportOptionDto transfer, int groupSize)
        {
            var departure = string.IsNullOrWhiteSpace(transfer.DepartureHub)
                ? transfer.FromProvinceName
                : transfer.DepartureHub;

            var arrival = string.IsNullOrWhiteSpace(transfer.ArrivalHub)
                ? transfer.ToProvinceName
                : transfer.ArrivalHub;

            var safeGroupSize = Math.Max(1, groupSize);
            var perPersonCost = RoundMoney(transfer.TotalCost / safeGroupSize);

            return $"Transport guidance: {transfer.Method} from {departure} to {arrival}. Estimated {transfer.TravelTimeMinutes} minutes, total {transfer.TotalCost:N0} (~{perPersonCost:N0}/person).";
        }

        private static DayActivityBuildResult BuildActivitiesForDay(
            Province destination,
            IDictionary<int, List<ScoredLocation>> attractionsByProvince,
            HashSet<int> visitedLocationIds,
            int groupSize,
            TripSegment tripSegment,
            decimal dailyLimit)
        {
            if (!attractionsByProvince.TryGetValue(destination.Id, out var attractions) || attractions.Count == 0)
            {
                return DayActivityBuildResult.Empty;
            }

            var available = attractions
                .Where(x => !visitedLocationIds.Contains(x.Location.LocationId))
                .ToList();

            if (available.Count == 0)
            {
                return DayActivityBuildResult.Empty;
            }

            var activities = new List<ActivityPlanDto>();
            var travelLegs = new List<TravelLegDto>();
            var dayStart = new TimeOnly(8, 30);
            var dayEnd = new TimeOnly(21, 30);
            var currentTime = dayStart;
            var previousLocation = default(Location);
            decimal remainingBudget = dailyLimit;

            while (available.Count > 0)
            {
                var remainingMinutes = dayEnd.ToTimeSpan() - currentTime.ToTimeSpan();
                if (remainingMinutes.TotalMinutes < 45)
                {
                    break;
                }

                var candidate = available
                    .Select(x =>
                    {
                        var distanceKm = previousLocation is null
                            ? 2d
                            : CalculateDistanceKm(previousLocation.Latitude, previousLocation.Longitude, x.Location.Latitude, x.Location.Longitude);

                        var transportOptions = BuildLocalTransportOptions(distanceKm, groupSize);
                        var selectedTransport = transportOptions.FirstOrDefault(option => option.Recommended)
                            ?? transportOptions.OrderBy(option => option.TotalCost).ThenBy(option => option.TravelTimeMinutes).First();

                        var travelMinutes = selectedTransport.TravelTimeMinutes;
                        var travelCost = selectedTransport.TotalCost;

                        var stayMinutes = GetRecommendedDurationMinutes(x.Location);

                        var departureAt = currentTime;
                        var startAt = currentTime.AddMinutes(travelMinutes);
                        var endAt = startAt.AddMinutes(stayMinutes);
                        var visitFitsTime = endAt <= dayEnd;
                        var visitIsOpen = IsOpenAtTime(x.Location, startAt, endAt);

                        var ticketCost = GetTicketPricePerPerson(x.Location) * groupSize;
                        var extraSpending = EstimateExtraSpending(x.Location, tripSegment, groupSize);
                        var totalCost = RoundMoney(ticketCost + extraSpending + travelCost);

                        var distanceScore = Math.Max(0d, 100d - (distanceKm * 10d));
                        var timeEfficiency = Math.Max(0d, 100d - ((travelMinutes + stayMinutes) / Math.Max(1d, remainingMinutes.TotalMinutes) * 100d));
                        var dynamicScore = x.Score * 0.4d + distanceScore * 0.3d + timeEfficiency * 0.3d;

                        return new
                        {
                            Scored = x,
                            TravelMinutes = travelMinutes,
                            StayMinutes = stayMinutes,
                            DepartureAt = departureAt,
                            StartAt = startAt,
                            EndAt = endAt,
                            DistanceKm = distanceKm,
                            FromLocationId = previousLocation?.LocationId,
                            FromLocationName = previousLocation?.LocationName ?? "Accommodation / city center",
                            TravelCost = RoundMoney(travelCost),
                            TotalCost = totalCost,
                            TicketCost = RoundMoney(ticketCost),
                            ExtraSpending = RoundMoney(extraSpending),
                            TransportOptions = transportOptions,
                            SelectedTransport = selectedTransport,
                            DynamicScore = dynamicScore,
                            Fits = totalCost <= remainingBudget && visitFitsTime && visitIsOpen
                        };
                    })
                    .Where(x => x.Fits)
                    .OrderByDescending(x => x.DynamicScore)
                    .FirstOrDefault();

                if (candidate is null)
                {
                    break;
                }

                var tags = candidate.Scored.Location.LocationTags
                    .Select(x => x.Tag.Title)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                activities.Add(new ActivityPlanDto(
                    candidate.Scored.Location.LocationId,
                    candidate.Scored.Location.LocationName,
                    candidate.StartAt,
                    candidate.EndAt,
                    candidate.TicketCost,
                    candidate.ExtraSpending,
                    candidate.TravelCost,
                    candidate.TotalCost,
                    Math.Round(candidate.DynamicScore, 2),
                    tags));

                travelLegs.Add(new TravelLegDto(
                    candidate.FromLocationId,
                    candidate.FromLocationName,
                    candidate.Scored.Location.LocationId,
                    candidate.Scored.Location.LocationName,
                    candidate.DepartureAt,
                    candidate.StartAt,
                    Math.Round(candidate.DistanceKm, 2),
                    candidate.SelectedTransport.Method,
                    candidate.SelectedTransport.TravelTimeMinutes,
                    candidate.SelectedTransport.TotalCost,
                    candidate.TransportOptions));

                visitedLocationIds.Add(candidate.Scored.Location.LocationId);
                available.RemoveAll(x => x.Location.LocationId == candidate.Scored.Location.LocationId);

                remainingBudget -= candidate.TotalCost;
                previousLocation = candidate.Scored.Location;
                currentTime = candidate.EndAt.AddMinutes(15);

                if (activities.Count >= 6)
                {
                    break;
                }
            }

            return new DayActivityBuildResult(activities, travelLegs);
        }

        private static List<LocalTransportOptionDto> BuildLocalTransportOptions(double distanceKm, int groupSize)
        {
            var safeDistance = Math.Max(0.2d, distanceKm);
            var safeGroupSize = Math.Max(1, groupSize);
            var options = new List<LocalTransportOptionDto>();

            if (safeDistance <= 2.0d)
            {
                options.Add(new LocalTransportOptionDto(
                    "Walking",
                    0m,
                    CalculateTravelMinutes(safeDistance, 4d, 0),
                    0,
                    "Free and healthy for short hops.",
                    "Not ideal in bad weather or with heavy luggage.",
                    safeDistance <= 1.2d));
            }

            var bikeVehicles = Math.Max(1, (int)Math.Ceiling(safeGroupSize / 2d));
            options.Add(new LocalTransportOptionDto(
                "Ride-hailing bike",
                RoundMoney((decimal)(9_000d * safeDistance * bikeVehicles)),
                CalculateTravelMinutes(safeDistance, 28d, 5),
                bikeVehicles,
                "Fast in dense traffic and easy to call.",
                "Limited luggage and less comfortable in rain.",
                safeGroupSize <= 2 && safeDistance <= 15d));

            var taxiVehicles = Math.Max(1, (int)Math.Ceiling(safeGroupSize / 4d));
            options.Add(new LocalTransportOptionDto(
                "Taxi 4-seat",
                RoundMoney((decimal)(15_000d * safeDistance * taxiVehicles)),
                CalculateTravelMinutes(safeDistance, 30d, 6),
                taxiVehicles,
                "Door-to-door and comfortable for small groups.",
                "Cost increases when multiple cars are needed.",
                safeGroupSize > 2 && safeGroupSize <= 4));

            var car7Vehicles = Math.Max(1, (int)Math.Ceiling(safeGroupSize / 7d));
            options.Add(new LocalTransportOptionDto(
                "7-seat car",
                RoundMoney((decimal)(20_000d * safeDistance * car7Vehicles)),
                CalculateTravelMinutes(safeDistance, 32d, 8),
                car7Vehicles,
                "Good balance of comfort and group capacity.",
                "Availability can vary during peak hours.",
                safeGroupSize > 4 && safeGroupSize <= 7));

            var vanVehicles = Math.Max(1, (int)Math.Ceiling(safeGroupSize / 16d));
            options.Add(new LocalTransportOptionDto(
                "16-seat van",
                RoundMoney((decimal)(35_000d * safeDistance * vanVehicles)),
                CalculateTravelMinutes(safeDistance, 25d, 10),
                vanVehicles,
                "Best when the whole group wants to move together.",
                "Higher base cost for shorter trips.",
                safeGroupSize > 7));

            if (options.Count > 0 && options.All(option => !option.Recommended))
            {
                var cheapest = options
                    .OrderBy(option => option.TotalCost)
                    .ThenBy(option => option.TravelTimeMinutes)
                    .First();

                var cheapestIndex = options.FindIndex(option =>
                    option.Method == cheapest.Method
                    && option.TotalCost == cheapest.TotalCost
                    && option.TravelTimeMinutes == cheapest.TravelTimeMinutes);

                if (cheapestIndex >= 0)
                {
                    options[cheapestIndex] = cheapest with { Recommended = true };
                }
            }

            return options;
        }

        private static int CalculateTravelMinutes(double distanceKm, double speedKmh, int staticBufferMinutes)
        {
            var travelMinutes = (int)Math.Ceiling((distanceKm / Math.Max(1d, speedKmh)) * 60d);
            return Math.Max(5, travelMinutes + Math.Max(0, staticBufferMinutes));
        }

        private static AccommodationRecommendationDto? BuildAccommodationRecommendation(
            Province destination,
            IDictionary<int, List<ScoredLocation>> hotelsByProvince,
            int groupSize,
            TripSegment hotelPreference,
            decimal dayBudget,
            ActivityPlanDto? firstActivity)
        {
            if (!hotelsByProvince.TryGetValue(destination.Id, out var hotels) || hotels.Count == 0)
            {
                return null;
            }

            var (minPrice, maxPrice) = GetHotelPriceRange(hotelPreference);
            var preferredHotels = hotels
                .Where(x =>
                {
                    var price = GetLocationAveragePrice(x.Location);
                    return price > 0m && price >= minPrice && price <= maxPrice;
                })
                .ToList();

            var source = preferredHotels.Count > 0 ? preferredHotels : hotels;

            var scored = source
                .Select(hotel =>
                {
                    var roomOptions = BuildRoomOptions(hotel.Location, groupSize, dayBudget);
                    var recommended = roomOptions.FirstOrDefault(x => x.Recommended) ?? roomOptions.FirstOrDefault();
                    var centerLat = (double)destination.Latitude;
                    var centerLon = (double)destination.Longitude;
                    var distanceKm = CalculateDistanceKm(
                        centerLat,
                        centerLon,
                        (double)hotel.Location.Latitude,
                        (double)hotel.Location.Longitude);

                    var distanceScore = Math.Max(0d, 100d - (distanceKm * 15d));
                    var refCost = recommended?.TotalCost ?? Math.Max(1m, GetLocationAveragePrice(hotel.Location) * Math.Max(1, groupSize));
                    var budgetScore = Math.Max(0d, 100d - ((double)(refCost / Math.Max(dayBudget, 1m)) * 100d));
                    var roomsNeeded = recommended?.RoomsNeeded ?? Math.Max(1, (int)Math.Ceiling(groupSize / 2d));
                    var groupScore = Math.Max(0d, 100d - ((roomsNeeded - 1) * 20d));
                    var amenitiesScore = recommended?.Amenities is null
                        ? 60d
                        : Math.Min(100d, recommended.Amenities.Split(',', StringSplitOptions.RemoveEmptyEntries).Length * 15d);

                    var totalScore = distanceScore * 0.25d + budgetScore * 0.35d + groupScore * 0.25d + amenitiesScore * 0.15d;
                    return new
                    {
                        Hotel = hotel.Location,
                        Score = totalScore,
                        Recommended = recommended,
                        RoomOptions = roomOptions
                    };
                })
                .OrderByDescending(x => x.Score)
                .Take(5)
                .ToList();

            if (scored.Count == 0)
            {
                return null;
            }

            var best = scored[0];
            var alternatives = scored
                .Skip(1)
                .Select(x => new AlternativeAccommodationDto(
                    x.Hotel.LocationId,
                    x.Hotel.LocationName,
                    Math.Round(x.Score, 2),
                    x.Recommended,
                    x.RoomOptions))
                .ToList();

            return new AccommodationRecommendationDto(
                best.Hotel.LocationId,
                best.Hotel.LocationName,
                Math.Round(best.Score, 2),
                best.Recommended,
                best.RoomOptions,
                alternatives);
        }

        private static List<RoomOptionDto> BuildRoomOptions(Location hotel, int groupSize, decimal dayBudget)
        {
            var options = new List<RoomOptionDto>();

            if (hotel.RoomTypes.Count == 0)
            {
                var fallbackOccupancy = Math.Min(Math.Max(groupSize, 2), 4);
                var fallbackRoomsNeeded = Math.Max(1, (int)Math.Ceiling(groupSize / (double)fallbackOccupancy));
                var fallbackPerPersonPrice = GetLocationAveragePrice(hotel);
                if (fallbackPerPersonPrice <= 0m)
                {
                    fallbackPerPersonPrice = 500_000m;
                }
                var fallbackTotal = RoundMoney(Math.Max(1, groupSize) * fallbackPerPersonPrice);

                options.Add(new RoomOptionDto(
                    "Standard",
                    fallbackOccupancy,
                    fallbackRoomsNeeded,
                    RoundMoney(fallbackPerPersonPrice),
                    fallbackTotal,
                    20,
                    null,
                    fallbackTotal <= dayBudget,
                    new List<string> { "Estimated from location per-person price range (PriceMin/PriceMax)." },
                    new List<string>()));

                return options;
            }

            foreach (var room in hotel.RoomTypes.OrderBy(x => x.PricePerNight))
            {
                var maxOccupancy = Math.Max(1, room.MaxOccupancy);
                var roomsNeeded = Math.Max(1, (int)Math.Ceiling(groupSize / (double)maxOccupancy));
                var totalCost = RoundMoney(roomsNeeded * room.PricePerNight);

                var recommended = maxOccupancy >= groupSize
                    && maxOccupancy <= groupSize + 2
                    && totalCost <= dayBudget;

                var pros = new List<string>();
                var cons = new List<string>();

                if (maxOccupancy >= groupSize)
                {
                    pros.Add("Can fit the whole group in a single room.");
                }
                else
                {
                    pros.Add("Flexible for splitting the group.");
                    cons.Add("Requires multiple rooms.");
                }

                if (totalCost <= dayBudget)
                {
                    pros.Add("Fits current daily budget.");
                }
                else
                {
                    cons.Add("May exceed current daily budget.");
                }

                if (room.AvailableRooms < roomsNeeded)
                {
                    cons.Add("Available rooms may be insufficient for group size.");
                }

                options.Add(new RoomOptionDto(
                    room.Name,
                    maxOccupancy,
                    roomsNeeded,
                    RoundMoney(room.PricePerNight),
                    totalCost,
                    room.AvailableRooms,
                    room.AmenitiesJson,
                    recommended,
                    pros,
                    cons));
            }

            if (options.All(x => !x.Recommended))
            {
                var cheapest = options.OrderBy(x => x.TotalCost).First();
                var cheapestIndex = options.FindIndex(x => x.Name == cheapest.Name && x.TotalCost == cheapest.TotalCost);
                if (cheapestIndex >= 0)
                {
                    options[cheapestIndex] = cheapest with { Recommended = true };
                }
            }

            return options;
        }

        private static decimal EstimateAccommodationBudget(
            IList<Province> dayDestinations,
            IDictionary<int, List<ScoredLocation>> hotelsByProvince,
            TripSegment hotelPreference,
            int groupSize)
        {
            if (dayDestinations.Count == 0)
            {
                return 0m;
            }

            var dayCountByDestination = dayDestinations
                .GroupBy(x => x.Id)
                .ToDictionary(x => x.Key, x => x.Count());

            var (fallbackMin, fallbackMax) = GetHotelPriceRange(hotelPreference);
            var fallbackNightly = (fallbackMin + fallbackMax) / 2m;

            decimal total = 0m;
            foreach (var kvp in dayCountByDestination)
            {
                var destinationId = kvp.Key;
                var nights = Math.Max(1, kvp.Value);

                decimal averageNightly = fallbackNightly;
                if (hotelsByProvince.TryGetValue(destinationId, out var hotels) && hotels.Count > 0)
                {
                    averageNightly = hotels
                        .Select(x => GetLocationAveragePrice(x.Location))
                        .Where(x => x > 0)
                        .DefaultIfEmpty(fallbackNightly)
                        .Average();
                }

                total += nights * averageNightly * Math.Max(1, groupSize);
            }

            return RoundMoney(total);
        }

        private static List<Province> OrderDestinationsByAttractionDensity(
            IList<int> destinationIds,
            IDictionary<int, Province> provinceById,
            IDictionary<int, List<ScoredLocation>> attractionsByProvince)
        {
            var ordered = new List<Province>();
            var remaining = destinationIds
                .Where(provinceById.ContainsKey)
                .Select(x => provinceById[x])
                .ToList();

            if (remaining.Count == 0)
            {
                return ordered;
            }

            var current = remaining[0];
            ordered.Add(current);
            remaining.RemoveAt(0);

            while (remaining.Count > 0)
            {
                var best = remaining
                    .Select(next =>
                    {
                        var distance = CalculateDistanceKm(current.Latitude, current.Longitude, next.Latitude, next.Longitude);
                        var attractionCount = attractionsByProvince.TryGetValue(next.Id, out var list) ? list.Count : 1;
                        var score = attractionCount / Math.Max(1d, distance);
                        return new { Province = next, Score = score };
                    })
                    .OrderByDescending(x => x.Score)
                    .First();

                ordered.Add(best.Province);
                remaining.Remove(best.Province);
                current = best.Province;
            }

            return ordered;
        }

        private static List<Province> AllocateDaysToDestinations(
            IList<Province> orderedDestinations,
            int totalDays,
            IDictionary<int, List<ScoredLocation>> attractionsByProvince)
        {
            var output = new List<Province>();

            if (orderedDestinations.Count == 0 || totalDays <= 0)
            {
                return output;
            }

            if (totalDays <= orderedDestinations.Count)
            {
                return orderedDestinations.Take(totalDays).ToList();
            }

            var allocation = orderedDestinations.ToDictionary(x => x.Id, _ => 1);
            var remainingDays = totalDays - orderedDestinations.Count;
            var extraDays = remainingDays;

            var weighted = orderedDestinations
                .Select(x =>
                {
                    var attractionCount = attractionsByProvince.TryGetValue(x.Id, out var list) ? list.Count : 1;
                    var weight = Math.Sqrt(Math.Max(1, attractionCount));
                    return new { Province = x, Weight = weight };
                })
                .ToList();

            var totalWeight = weighted.Sum(x => x.Weight);
            var remainders = new List<(int ProvinceId, double Remainder)>();

            foreach (var item in weighted)
            {
                var share = totalWeight <= 0 ? 0 : (item.Weight / totalWeight) * extraDays;
                var fullDays = (int)Math.Floor(share);
                allocation[item.Province.Id] += fullDays;
                remainders.Add((item.Province.Id, share - fullDays));
                remainingDays -= fullDays;
            }

            foreach (var remainder in remainders.OrderByDescending(x => x.Remainder))
            {
                if (remainingDays <= 0)
                {
                    break;
                }

                allocation[remainder.ProvinceId] += 1;
                remainingDays--;
            }

            foreach (var destination in orderedDestinations)
            {
                for (var i = 0; i < allocation[destination.Id]; i++)
                {
                    output.Add(destination);
                }
            }

            if (output.Count > totalDays)
            {
                return output.Take(totalDays).ToList();
            }

            while (output.Count < totalDays)
            {
                output.Add(output[^1]);
            }

            return output;
        }

        private static (decimal Min, decimal Max) GetHotelPriceRange(TripSegment segment)
        {
            return segment switch
            {
                TripSegment.Budget => (0m, 500_000m),
                TripSegment.Luxury => (2_000_000m, 4_000_000m),
                _ => (500_000m, 2_000_000m)
            };
        }

        private static decimal EstimateExtraSpending(Location location, TripSegment segment, int groupSize)
        {
            var (min, max) = GetLocationPriceRange(location);
            if (min <= 0m && max <= 0m)
            {
                (min, max) = segment switch
                {
                    TripSegment.Budget => (50_000m, 150_000m),
                    TripSegment.Luxury => (400_000m, 1_000_000m),
                    _ => (150_000m, 400_000m)
                };
            }

            var shoppingFoodTags = new HashSet<string>(new[] { "shopping", "food", "market", "restaurant" }, StringComparer.OrdinalIgnoreCase);
            var hasSpendingTag = location.LocationTags.Any(x => shoppingFoodTags.Contains(x.Tag.Title));
            var multiplier = hasSpendingTag ? 1.2m : 1.0m;

            var random = Random.Shared.NextDouble();
            var sampled = min + (decimal)random * (max - min);
            return RoundMoney(sampled * multiplier * groupSize);
        }

        private static bool IsAccommodationLocation(Location location)
        {
            if (location.LocationType is not null &&
                !string.IsNullOrWhiteSpace(location.LocationType.TypeName) &&
                AccommodationTags.Contains(location.LocationType.TypeName))
            {
                return true;
            }

            return location.LocationTags.Any(x => AccommodationTags.Contains(x.Tag.Title));
        }

        private static ScoredLocation ScoreLocation(Location location, HashSet<string> normalizedFavoriteTags)
        {
            var locationTags = location.LocationTags
                .Select(x => x.Tag.Title)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.ToLowerInvariant())
                .Distinct()
                .ToList();

            var matchCount = normalizedFavoriteTags.Count == 0
                ? 0
                : locationTags.Count(normalizedFavoriteTags.Contains);

            var baseQuality = NormalizeLocationScore(location.Score, 50d);
            var quality = normalizedFavoriteTags.Count == 0
                ? baseQuality
                : Math.Min(100d, baseQuality + matchCount * 10d);

            var stayMinutes = GetRecommendedDurationMinutes(location);

            var timeEfficiency = Math.Max(0d, 100d - ((stayMinutes - 30d) / 3d));
            var costEfficiency = Math.Max(0d, 100d - ((double)GetLocationAveragePrice(location) / 5_000d));
            var score = quality * 0.4d + timeEfficiency * 0.35d + costEfficiency * 0.25d;

            return new ScoredLocation(location, Math.Round(score, 2));
        }

        private static decimal CalculateContingencyPercentage(decimal totalBudget)
        {
            if (totalBudget < 5_000_000m) return 0.20m;
            if (totalBudget < 10_000_000m) return 0.15m;
            if (totalBudget < 20_000_000m) return 0.10m;
            if (totalBudget < 50_000_000m) return 0.08m;
            return 0.05m;
        }

        private static double GetDayWeight(int dayIndex, int totalDays)
        {
            if (dayIndex == 0) return 1.3;
            if (dayIndex == 1) return 1.1;
            if (dayIndex == totalDays - 1) return 1.2;
            return 1.0;
        }

        private static bool IsOpenAtTime(Location location, TimeOnly start, TimeOnly end)
        {
            return true;
        }

        private static int GetRecommendedDurationMinutes(Location location)
        {
            return location.RecommentDurations.HasValue && location.RecommentDurations.Value > 0
                ? location.RecommentDurations.Value
                : 60;
        }

        private static decimal GetTicketPricePerPerson(Location location)
        {
            return location.TicketPrice > 0m ? location.TicketPrice : 0m;
        }

        private static (decimal Min, decimal Max) GetLocationPriceRange(Location location)
        {
            var min = Math.Max(0m, location.PriceMin);
            var max = Math.Max(0m, location.PriceMax);

            if (min <= 0m && max <= 0m && location.TicketPrice > 0m)
            {
                min = location.TicketPrice;
                max = location.TicketPrice;
            }

            if (min <= 0m && max > 0m)
            {
                min = max;
            }

            if (max <= 0m && min > 0m)
            {
                max = min;
            }

            if (max < min)
            {
                (min, max) = (max, min);
            }

            return (min, max);
        }

        private static decimal GetLocationAveragePrice(Location location)
        {
            var (min, max) = GetLocationPriceRange(location);
            if (min <= 0m && max <= 0m)
            {
                return 0m;
            }

            return (min + max) / 2m;
        }

        private static double NormalizeLocationScore(decimal score, double fallback)
        {
            if (score <= 0m)
            {
                return fallback;
            }

            var raw = (double)score;
            if (raw <= 5d)
            {
                raw *= 20d;
            }
            else if (raw <= 10d)
            {
                raw *= 10d;
            }

            return Math.Min(100d, raw);
        }

        private static double CalculateDistanceKm(decimal fromLat, decimal fromLon, decimal toLat, decimal toLon)
        {
            return CalculateDistanceKm((double)fromLat, (double)fromLon, (double)toLat, (double)toLon);
        }

        private static double CalculateDistanceKm(double fromLat, double fromLon, double toLat, double toLon)
        {
            const double earthRadiusKm = 6371d;
            var dLat = DegreesToRadians(toLat - fromLat);
            var dLon = DegreesToRadians(toLon - fromLon);
            var lat1 = DegreesToRadians(fromLat);
            var lat2 = DegreesToRadians(toLat);

            var a = Math.Pow(Math.Sin(dLat / 2d), 2d) + Math.Cos(lat1) * Math.Cos(lat2) * Math.Pow(Math.Sin(dLon / 2d), 2d);
            var c = 2d * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1d - a));
            return earthRadiusKm * c;
        }

        private static double DegreesToRadians(double value)
        {
            return value * Math.PI / 180d;
        }

        private static decimal RoundMoney(decimal value)
        {
            return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
        }

        private sealed record DayActivityBuildResult(IList<ActivityPlanDto> Activities, IList<TravelLegDto> TravelLegs)
        {
            public static DayActivityBuildResult Empty { get; } = new(new List<ActivityPlanDto>(), new List<TravelLegDto>());
        }

        private sealed record ScoredLocation(Location Location, double Score);
    }
}