using System;
using System.Collections.Generic;

namespace HSTS.Application.Itineraries.Common
{
    public class ItineraryDto
    {
        public List<ItineraryDayDto> Days { get; set; } = new();
        public BudgetBreakdownDto BudgetBreakdown { get; set; } = new();
    }

    public class ItineraryDayDto
    {
        public DateTime Date { get; set; }
        public List<ItineraryItemDto> Items { get; set; } = new();
    }

    public class ItineraryItemDto
    {
        public string TimeBlock { get; set; } = null!; // Morning, Lunch, etc.
        public DateTime ScheduledTime { get; set; }
        public int? LocationId { get; set; }
        public string ActivityName { get; set; } = null!;
        public double EstimatedCost { get; set; }
        public int DurationMinutes { get; set; }
        public double? DistanceToNext { get; set; }
        public int? TravelTimeToNext { get; set; }
    }

    public class BudgetBreakdownDto
    {
        public double TotalBudget { get; set; }
        public double ContingencyFund { get; set; }
        public double TransportAllocation { get; set; }
        public double AccommodationAllocation { get; set; }
        public double ActivitiesAllocation { get; set; }
    }
}
