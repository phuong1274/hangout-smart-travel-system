namespace HSTS.Application.Itineraries
{
    public static class ItineraryDefaults
    {
        // === SCHEDULING ===
        public const int MinStayMinutes = 45;
        public const int DefaultStayMinutes = 90;
        public const int MaxStayMinutes = 240;
        public const int MaxActivitiesPerDay = 6;
        public const int MaxAddMinutes = 1440;

        // === DAY TIME BOUNDARIES ===
        public static readonly TimeOnly DayStartTime = new(6, 30);
        public static readonly TimeOnly DayEndTime = new(21, 30);
        public static readonly TimeOnly LunchStart = new(11, 30);
        public static readonly TimeOnly LunchEnd = new(13, 30);
        public static readonly TimeOnly DinnerStart = new(18, 0);
        public static readonly TimeOnly DinnerEnd = new(20, 0);

        // === HOTEL CHECK-IN/OUT TIMES ===
        public static readonly TimeOnly FirstDayCheckInTime = new(13, 0);
        public static readonly TimeOnly TransferDayCheckInTime = new(11, 0);
        public static readonly TimeOnly EveningCheckInTime = new(21, 0);
        public static readonly TimeOnly CheckOutTime = new(12, 0);
        public static readonly TimeOnly ReturnDepartureTime = new(17, 0);
        public static readonly TimeOnly LatestReturnArrivalTime = new(23, 59);
        public const int CheckInDurationMinutes = 30;
        public const int CheckOutDurationMinutes = 20;
        public const int LuggageRefreshMinutes = 15;
        public const int BufferAfterCheckInMinutes = 10;
        public const int BufferAfterArrivalMinutes = 20;
        public const int AfterMealBufferMinutes = 15;
        public const int AfterActivityBufferMinutes = 15;

        // === TRANSPORT ===
        public const double DefaultSpeedKmh = 35.0;
        public const double FirstMileIntercityThresholdKm = 100.0;
        public const double TrainMinDistanceKm = 100.0;
        public const double FlightMinDistanceKm = 200.0;
        public const double FlightBracketMinDistanceKm = 300.0;
        public const double TrainSpeedKmh = 50.0;
        public const double PlaneSpeedKmh = 800.0;
        public const int PlaneOverheadMinutes = 90;
        public const int MinTravelMinutes = 10;
        public const int MinFlightMinutes = 60;
        public const int MinTrainMinutes = 60;
        public const double MaxReasonableDistanceKm = 10_000.0;
        public const double FallbackIntercityDistanceKm = 500.0;
        public const double FallbackLocalDistanceKm = 50.0;
        public const double LocalTransportCostPerKm = 8_000.0;
        public const int LocalTransportMaxPassengers = 4;

        // === BUDGET ===
        public const decimal ActivityBudgetFallbackRatio = 0.3m;
        public const decimal BudgetFloorRatio = 0.7m;
        public const decimal BudgetLimitRatio = 1.3m;
        public const decimal RolloverMaxRatio = 0.5m;

        // === CONTINGENCY THRESHOLDS (VND) ===
        public const decimal ContingencyThreshold1 = 5_000_000m;
        public const decimal ContingencyPercent1 = 0.20m;
        public const decimal ContingencyThreshold2 = 10_000_000m;
        public const decimal ContingencyPercent2 = 0.15m;
        public const decimal ContingencyThreshold3 = 20_000_000m;
        public const decimal ContingencyPercent3 = 0.10m;
        public const decimal ContingencyThreshold4 = 50_000_000m;
        public const decimal ContingencyPercent4 = 0.08m;
        public const decimal ContingencyPercentDefault = 0.05m;

        // === DAY WEIGHTS ===
        public const double DayWeight1 = 1.3;
        public const double DayWeight2 = 1.1;
        public const double DayWeightLast = 1.2;
        public const double DayWeightDefault = 1.0;

        // === SCORING WEIGHTS ===
        public const double QualityWeight = 0.40;
        public const double TimeEfficiencyWeight = 0.35;
        public const double CostEfficiencyWeight = 0.25;
        public const double TimeEfficiencyBase = 30.0;
        public const double TimeEfficiencyDivisor = 3.0;
        public const double CostEfficiencyDivisor = 5000.0;
        public const int TagMatchBonus = 10;
        public const int MaxQualityScore = 100;

        // === DYNAMIC SCORE WEIGHTS (Activity Picker) ===
        public const double DynamicBaseWeight = 0.4;
        public const double DynamicDistanceWeight = 0.3;
        public const double DynamicTimeWeight = 0.3;
        public const double DistanceScoreMultiplier = 10.0;
        public const int TopCandidateCount = 3;

        // === WEATHER SCORING ===
        public const double OutdoorBadWeatherMultiplier = 0.5;
        public const double IndoorBadWeatherMultiplier = 1.5;

        // === EXTRA SPENDING DEFAULTS (VND per person per activity) ===
        // Budget: street food + cheap attractions => ~200k-350k/day, ~6 activities => 30k-60k/activity
        public const decimal ExtraSpendingBudgetMin = 30_000m;
        public const decimal ExtraSpendingBudgetMax = 60_000m;
        // Standard: restaurants + theme parks => ~700k-1.4M/day => 100k-250k/activity
        public const decimal ExtraSpendingStandardMin = 100_000m;
        public const decimal ExtraSpendingStandardMax = 250_000m;
        // Luxury: fine dining + premium experiences => ~2.5M-6M/day => 400k-1M/activity
        public const decimal ExtraSpendingLuxuryMin = 400_000m;
        public const decimal ExtraSpendingLuxuryMax = 1_000_000m;
        public const decimal SpendingCategoryMultiplier = 1.2m;

        // === ACCOMMODATION PRICE BRACKETS (VND per person per night) ===
        // Budget: homestay, nha nghi, hostel/dorm => 150k-300k
        public const decimal HotelBudgetMin = 150_000m;
        public const decimal HotelBudgetMax = 300_000m;
        // Standard: khach san 3-4 sao, co buffet sang, ho boi => 600k-1.2M
        public const decimal HotelStandardMin = 600_000m;
        public const decimal HotelStandardMax = 1_200_000m;
        // Luxury: resort 5 sao, villa rieng tu => 2.5M-5M+
        public const decimal HotelLuxuryMin = 2_500_000m;
        public const decimal HotelLuxuryMax = 5_000_000m;

        // === ACCOMMODATION SCORING WEIGHTS ===
        public const double AccomDistanceWeight = 0.25;
        public const double AccomBudgetWeight = 0.35;
        public const double AccomGroupWeight = 0.25;
        public const double AccomAmenityWeight = 0.15;
        public const double AccomDistanceScoreMultiplier = 15.0;
        public const double AccomAmenityScoreMultiplier = 15.0;
        public const double AccomGroupBaseWithAmenities = 70.0;
        public const double AccomGroupBaseWithout = 50.0;
        public const double AccomDefaultBudgetScore = 50.0;
        public const int AccomTopAttractionsCount = 5;
        public const int AccomMaxRecommendations = 5;

        // === BRACKET COST FALLBACKS (VND per person) ===

        // General bracket
        public const decimal BracketCost1000PlusKm = 1_800_000m;
        public const decimal BracketCost600PlusKm = 1_000_000m;
        public const decimal BracketCost300PlusKm = 600_000m;
        public const decimal BracketCost150PlusKm = 400_000m;
        public const decimal BracketCostDefault = 200_000m;

        // Bus bracket
        public const decimal BusCost1000PlusKm = 800_000m;
        public const decimal BusCost600PlusKm = 500_000m;
        public const decimal BusCost300PlusKm = 300_000m;
        public const decimal BusCost150PlusKm = 200_000m;
        public const decimal BusCostDefault = 100_000m;

        // Train bracket
        public const decimal TrainCost1000PlusKm = 1_200_000m;
        public const decimal TrainCost600PlusKm = 800_000m;
        public const decimal TrainCost300PlusKm = 500_000m;
        public const decimal TrainCost150PlusKm = 350_000m;
        public const decimal TrainCostDefault = 200_000m;

        // Plane bracket
        public const decimal PlaneCost1000PlusKm = 2_500_000m;
        public const decimal PlaneCost600PlusKm = 1_800_000m;
        public const decimal PlaneCost300PlusKm = 1_200_000m;
        public const decimal PlaneCostDefault = 900_000m;

        // === TRANSPORT CATEGORY DISTANCE THRESHOLDS ===
        public const double AirplaneCategoryThresholdKm = 1000.0;
        public const double TrainOrPlaneCategoryThresholdKm = 600.0;
        public const double TrainCategoryThresholdKm = 300.0;
        public const int AirplaneGroupSizeThreshold = 4;

        // === NEARBY PROVINCE SUGGESTION ===
        public const int NearbyProvinceCandidateCount = 5;

        // === TAG KEYWORDS ===
        public static readonly HashSet<string> IndoorTagKeywords = new(StringComparer.OrdinalIgnoreCase)
            { "museum", "restaurant", "shopping", "spa", "cafe", "mall", "cinema", "theater" };

        public static readonly HashSet<string> OutdoorTagKeywords = new(StringComparer.OrdinalIgnoreCase)
            { "park", "beach", "hiking", "waterfall", "garden", "mountain", "lake", "camping" };

        public static readonly HashSet<string> AccommodationTypeKeywords = new(StringComparer.OrdinalIgnoreCase)
            { "hotel", "resort", "homestay", "hostel", "guesthouse", "accommod", "khach san", "nha nghi", "cho nghi" };

        public static readonly HashSet<string> SpendingCategoryKeywords = new(StringComparer.OrdinalIgnoreCase)
            { "Shopping", "Food", "Market", "Restaurant" };

        public static readonly HashSet<string> RestaurantKeywords = new(StringComparer.OrdinalIgnoreCase)
            { "Restaurant", "Food", "Cafe" };
    }
}
