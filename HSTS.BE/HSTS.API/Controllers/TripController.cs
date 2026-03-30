using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HSTS.Application.TripGen;
using System.Text.Json;

namespace HSTS.API.Controllers
{
    /// <summary>
    /// Trip itinerary API (STUB - returns mock data for testing)
    /// </summary>
    [ApiController]
    [Route("api/trip")]
    public class TripController : ControllerBase
    {
        private static readonly TripGenResponse MockTripData = new TripGenResponse(
            new List<DayPlan>
            {
                new DayPlan(
                    "Day 1 - Hanoi",
                    "loc_hn_01",
                    new DailyBudgetStatus(3100000, 1300000, 1500000, 1.2m),
                    new List<TimelineEvent>
                    {
                        new TimelineEvent(
                            "CheckIn",
                            "14:00 - 14:30",
                            "Afternoon",
                            "Hotel Check-in: hotel_lux_hn_01",
                            AccommodationOptions: new List<AccommodationOption>
                            {
                                new AccommodationOption(
                                    "hotel_lux_hn_01",
                                    "Luxury 5-star hotel in the center of loc_hn_01",
                                    2000000, 4, 2, 4000000,
                                    new List<string> { "WiFi", "AC", "Pool", "Spa", "Breakfast" },
                                    true, "Matches Luxury preference | Excellent location", ""
                                )
                            },
                            SelectedAccommodationIndex: 0,
                            AlternativeAccommodations: new List<AccommodationOption>
                            {
                                new AccommodationOption(
                                    "hotel_lux_hn_02",
                                    "Premium services",
                                    0, 0, 0, 4500000,
                                    new List<string> { "WiFi", "AC", "Gym", "Breakfast" },
                                    false, "", "Higher cost", 0.45m
                                )
                            },
                            Action: "CheckIn",
                            CheckInTime: "14:00:00",
                            CheckOutTime: "12:00:00"
                        ),
                        new TimelineEvent(
                            "Transport",
                            "15:00 - 15:15",
                            "Afternoon",
                            "Transfer to poi_hn_001 (Temple of Literature)",
                            TransportOptions: new List<TransportOption>
                            {
                                new TransportOption(
                                    "trans_taxi_4",
                                    "1 x Taxi 4-seat",
                                    25000, 15, 1, true, 6250, 4,
                                    "hotel_lux_hn_01", "poi_hn_001",
                                    "Fast, door-to-door", "Costly during rush hour"
                                )
                            },
                            SelectedTransportIndex: 0
                        ),
                        new TimelineEvent(
                            "Visit",
                            "15:15 - 17:30",
                            "Afternoon",
                            "Visit poi_hn_001 (Sightseeing & Culture)",
                            "poi_hn_001",
                            TicketCost: 120000,
                            ExtraSpendingCost: 500000,
                            GroupDiscountApplied: false
                        ),
                        new TimelineEvent(
                            "Transport",
                            "17:30 - 17:50",
                            "Evening",
                            "Transfer to poi_hn_food_01 (Luxury Vietnamese Restaurant)",
                            TransportOptions: new List<TransportOption>
                            {
                                new TransportOption(
                                    "trans_taxi_4",
                                    "1 x Taxi 4-seat",
                                    35000, 20, 1, true, 8750, 4,
                                    "poi_hn_001", "poi_hn_food_01",
                                    "Comfortable ride to dinner", ""
                                )
                            },
                            SelectedTransportIndex: 0
                        ),
                        new TimelineEvent(
                            "Visit",
                            "17:50 - 19:30",
                            "Evening",
                            "Dinner at poi_hn_food_01 (Food)",
                            "poi_hn_food_01",
                            ExtraSpendingCost: 1800000,
                            GroupDiscountApplied: false
                        ),
                        new TimelineEvent(
                            "Transport",
                            "19:30 - 19:40",
                            "Evening",
                            "Walking to poi_hn_sight_02 (Hoan Kiem Walking Street)",
                            TransportOptions: new List<TransportOption>
                            {
                                new TransportOption(
                                    "trans_walk",
                                    "Walking",
                                    0, 10, 0, true, 0, 4,
                                    "poi_hn_food_01", "poi_hn_sight_02",
                                    "Enjoy the evening breeze", ""
                                )
                            },
                            SelectedTransportIndex: 0
                        ),
                        new TimelineEvent(
                            "Visit",
                            "19:40 - 21:00",
                            "Evening",
                            "Evening Stroll at poi_hn_sight_02 (Culture & Sightseeing)",
                            "poi_hn_sight_02",
                            TicketCost: 0,
                            ExtraSpendingCost: 300000,
                            GroupDiscountApplied: false
                        ),
                        new TimelineEvent(
                            "Accommodation",
                            "21:30 - 07:00",
                            "Night Rest",
                            "Overnight at hotel_lux_hn_01",
                            "hotel_lux_hn_01",
                            Cost: 4000000
                        )
                    }
                ),
                new DayPlan(
                    "Day 2 - Ha Noi - Da Nang",
                    "loc_dn_01",
                    new DailyBudgetStatus(5200000, 1500000, 2000000, 1.5m),
                    new List<TimelineEvent>
                    {
                        new TimelineEvent(
                            "CheckOut",
                            "08:00 - 08:30",
                            "Morning",
                            "Hotel Check-out: hotel_lux_hn_01",
                            "hotel_lux_hn_01",
                            Action: "CheckOut",
                            CheckOutTime: "12:00:00"
                        ),
                        new TimelineEvent(
                            "Transport",
                            "09:00 - 10:30",
                            "Morning",
                            "Flight from hub_airport_hn to hub_airport_dn",
                            TransportOptions: new List<TransportOption>
                            {
                                new TransportOption(
                                    "trans_flight_01",
                                    "Direct Flight",
                                    4800000, 90, 1, true, 1200000, 4,
                                    "hub_airport_hn", "hub_airport_dn",
                                    "Fast, comfortable", ""
                                )
                            },
                            SelectedTransportIndex: 0
                        ),
                        new TimelineEvent(
                            "CheckIn",
                            "14:00 - 14:30",
                            "Afternoon",
                            "Hotel Check-in: hotel_lux_dn_01",
                            AccommodationOptions: new List<AccommodationOption>
                            {
                                new AccommodationOption(
                                    "hotel_lux_dn_01",
                                    "Luxury beachside resort in loc_dn_01",
                                    2500000, 4, 2, 5000000,
                                    new List<string> { "WiFi", "Private Beach", "Breakfast" },
                                    true, "Matches Beach and Luxury tags", ""
                                )
                            },
                            SelectedAccommodationIndex: 0,
                            Action: "CheckIn",
                            CheckInTime: "14:00:00",
                            CheckOutTime: "12:00:00"
                        ),
                        new TimelineEvent(
                            "Visit",
                            "15:30 - 17:30",
                            "Afternoon",
                            "Relax at poi_dn_beach_01 (Beach)",
                            "poi_dn_beach_01",
                            TicketCost: 0,
                            ExtraSpendingCost: 400000,
                            GroupDiscountApplied: false
                        ),
                        new TimelineEvent(
                            "Transport",
                            "17:30 - 17:50",
                            "Evening",
                            "Transfer to poi_dn_food_01 (Premium Seafood Restaurant)",
                            TransportOptions: new List<TransportOption>
                            {
                                new TransportOption(
                                    "trans_taxi_7",
                                    "1 x Taxi 7-seat",
                                    50000, 20, 1, true, 12500, 4,
                                    "poi_dn_beach_01", "poi_dn_food_01",
                                    "Spacious for groups", ""
                                )
                            },
                            SelectedTransportIndex: 0
                        ),
                        new TimelineEvent(
                            "Visit",
                            "17:50 - 20:00",
                            "Evening",
                            "Seafood Dinner at poi_dn_food_01 (Food)",
                            "poi_dn_food_01",
                            ExtraSpendingCost: 2500000,
                            GroupDiscountApplied: false
                        ),
                        new TimelineEvent(
                            "Accommodation",
                            "20:30 - 07:00",
                            "Night Rest",
                            "Overnight at hotel_lux_dn_01",
                            "hotel_lux_dn_01",
                            Cost: 5000000
                        )
                    }
                )
            },
            new TripSummary(
                34150000,
                new CostBreakdown(12000000, 7000000, 10000000, 5150000),
                850000,
                2.4m,
                false,
                null,
                30000000
            )
        );

        /// <summary>
        /// Generate a trip itinerary (STUB - returns mock data)
        /// </summary>
        /// <returns>Mock trip itinerary with schedule and budget</returns>
        [HttpGet("generate")]
        [AllowAnonymous]
        public IActionResult Generate()
        {
            return Ok(MockTripData);
        }

        /// <summary>
        /// Get trip by ID (STUB - returns same mock data for any ID)
        /// </summary>
        /// <param name="tripId">Trip ID (ignored in stub mode)</param>
        /// <returns>Mock trip itinerary</returns>
        [HttpGet("{tripId}")]
        [AllowAnonymous]
        public IActionResult Get(string tripId)
        {
            return Ok(MockTripData);
        }
    }
}
