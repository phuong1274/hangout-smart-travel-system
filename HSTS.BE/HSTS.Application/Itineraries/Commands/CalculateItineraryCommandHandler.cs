using MediatR;
using HSTS.Application.Interfaces;
using HSTS.Application.Itineraries.Common;
using HSTS.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using static HSTS.Application.Interfaces.IRepository;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Itineraries.Commands
{
    public class CalculateItineraryCommandHandler : IRequestHandler<CalculateItineraryCommand, ItineraryDto>
    {
        private readonly IRepository<Location> _locationRepository;
        private readonly IDistanceService _distanceService;
        private readonly IWeatherService _weatherService;

        public CalculateItineraryCommandHandler(
            IRepository<Location> locationRepository,
            IDistanceService distanceService,
            IWeatherService weatherService)
        {
            _locationRepository = locationRepository;
            _distanceService = distanceService;
            _weatherService = weatherService;
        }

        public async Task<ItineraryDto> Handle(CalculateItineraryCommand request, CancellationToken cancellationToken)
        {
            var result = new ItineraryDto();

            // 1. Dynamic Budget Partitioning
            // Truncate a Contingency Fund (10% default). Allocate the rest.
            double contingencyRate = 0.10; 
            result.BudgetBreakdown = new BudgetBreakdownDto
            {
                TotalBudget = request.TotalBudget,
                ContingencyFund = request.TotalBudget * contingencyRate,
                TransportAllocation = request.TotalBudget * 0.25,
                AccommodationAllocation = request.TotalBudget * 0.35,
                ActivitiesAllocation = request.TotalBudget * 0.30
            };

            // 2. Fetch Potential Locations
            var locations = await _locationRepository.Query()
                .Include(l => l.District)
                .ThenInclude(d => d.Province)
                .ToListAsync(cancellationToken);

            var visitedLocationIds = new HashSet<int>();
            var currentLocation = new { Lat = request.StartLat, Lon = request.StartLon, ProvinceId = -1 };

            // Dynamic Budget Allocation
            int totalDays = (request.EndDate.Date - request.StartDate.Date).Days + 1;
            double baseStepBudget = result.BudgetBreakdown.ActivitiesAllocation / (totalDays * 1.5);

            for (var date = request.StartDate.Date; date <= request.EndDate.Date; date = date.AddDays(1))
            {
                int dayIndex = (date - request.StartDate.Date).Days;
                double weight = 1.0;
                if (dayIndex == 0) weight = 1.3;
                else if (dayIndex == 1) weight = 1.1;
                else if (dayIndex == totalDays - 1) weight = 1.2;

                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                    weight *= 1.15;

                double dailyStepBudget = baseStepBudget * weight;

                var dayDto = new ItineraryDayDto { Date = date };

                // Daily Blocks: Morning (08:00), Lunch (12:00), Afternoon (13:00), Evening (18:00)
                var timeBlocks = new Dictionary<string, TimeSpan>
                {
                    { "Morning", new TimeSpan(8, 0, 0) },
                    { "Lunch", new TimeSpan(12, 0, 0) },
                    { "Afternoon", new TimeSpan(13, 0, 0) },
                    { "Evening", new TimeSpan(18, 0, 0) }
                };

                foreach (var block in timeBlocks)
                {
                    // Multi-Factor Scoring Engine
                    // Formula: (MatchTags * 0.4) + (TimeEfficiency * 0.3) + (CostEfficiency * 0.15) + (WeatherFactor * 0.15)
                    
                    var bestLocation = await FindBestLocationAsync(
                        locations, 
                        visitedLocationIds, 
                        request.Preferences, 
                        currentLocation.Lat, 
                        currentLocation.Lon, 
                        date, 
                        dailyStepBudget); // Dynamic daily limit

                    if (bestLocation != null)
                    {
                        var route = await _distanceService.GetRouteInfoAsync(
                            currentLocation.Lat, currentLocation.Lon, 
                            bestLocation.Latitude, bestLocation.Longitude, "driving");

                        // Inter-city Logic: If moving between different Provinces
                        string transportMode = "Driving";
                        if (currentLocation.ProvinceId != -1 && currentLocation.ProvinceId != bestLocation.District.ProvinceId)
                        {
                            if (route.DistanceKm > 400) transportMode = "Flight";
                            else if (route.DistanceKm > 150) transportMode = "Train/Bus";
                        }

                        var item = new ItineraryItemDto
                        {
                            TimeBlock = block.Key,
                            ScheduledTime = date.Add(block.Value),
                            LocationId = bestLocation.Id,
                            ActivityName = $"{bestLocation.Name} (via {transportMode})",
                            EstimatedCost = bestLocation.AverageBudget,
                            DurationMinutes = bestLocation.AverageStayDuration,
                            DistanceToNext = route.DistanceKm,
                            TravelTimeToNext = route.DurationMinutes
                        };

                        dayDto.Items.Add(item);
                        visitedLocationIds.Add(bestLocation.Id);
                        currentLocation = new { Lat = bestLocation.Latitude, Lon = bestLocation.Longitude, ProvinceId = bestLocation.District.ProvinceId };
                    }
                }

                result.Days.Add(dayDto);
            }

            return result;
        }

        private async Task<Location?> FindBestLocationAsync(
            List<Location> locations, 
            HashSet<int> visitedIds, 
            List<string> preferences, 
            double currentLat, 
            double currentLon, 
            DateTime date,
            double idealCostLimit)
        {
            Location? best = null;
            double highestScore = -1;

            foreach (var loc in locations.Where(l => !visitedIds.Contains(l.Id)))
            {
                // MatchTags (0.4)
                double matchTags = preferences.Any() 
                    ? (double)loc.Tags.Intersect(preferences).Count() / preferences.Count 
                    : 0.5;

                // TimeEfficiency (0.3) - Based on distance (closer is better)
                // Simple normalization: 1 / (1 + distance/10)
                double dist = Math.Sqrt(Math.Pow(loc.Latitude - currentLat, 2) + Math.Pow(loc.Longitude - currentLon, 2)) * 111; // Approx km
                double timeEff = 1.0 / (1.0 + dist / 20.0);

                // CostEfficiency (0.15)
                double costEff = loc.AverageBudget <= idealCostLimit ? 1.0 : idealCostLimit / loc.AverageBudget;

                // WeatherFactor (0.15)
                double weatherFactor = await _weatherService.GetWeatherFactorAsync(loc.Latitude, loc.Longitude, date);

                double score = (matchTags * 0.4) + (timeEff * 0.3) + (costEff * 0.15) + (weatherFactor * 0.15);

                if (score > highestScore)
                {
                    highestScore = score;
                    best = loc;
                }
            }

            return best;
        }
    }
}
