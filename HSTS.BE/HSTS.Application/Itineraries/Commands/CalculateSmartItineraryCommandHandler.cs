using MediatR;
using ErrorOr;
using HSTS.Application.Interfaces;
using HSTS.Application.Itineraries.Common;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Commands;

public class CalculateSmartItineraryCommandHandler : IRequestHandler<CalculateSmartItineraryCommand, ErrorOr<ItineraryDto>>
{
    private readonly IAppDbContext _context;
    private readonly IDistanceService _distanceService;
    private readonly IWeatherService _weatherService;

    public CalculateSmartItineraryCommandHandler(
        IAppDbContext context,
        IDistanceService distanceService,
        IWeatherService weatherService)
    {
        _context = context;
        _distanceService = distanceService;
        _weatherService = weatherService;
    }

    public async Task<ErrorOr<ItineraryDto>> Handle(CalculateSmartItineraryCommand request, CancellationToken cancellationToken)
    {
        var result = new ItineraryDto();

        // 1. Partition Budget
        result.BudgetBreakdown = PartitionBudget(request.TotalBudget);

        // 2. Fetch Potential Locations based on Destinations (Provinces/Districts)
        // For simplicity, we fetch all for now or filter by names if provided
        var locationsQuery = _context.Locations
            .Include(l => l.District)
            .ThenInclude(d => d.Province)
            .AsNoTracking();

        if (request.Destinations.Any())
        {
            locationsQuery = locationsQuery.Where(l => 
                request.Destinations.Contains(l.District.Name) || 
                request.Destinations.Contains(l.District.Province.Name));
        }

        var locations = await locationsQuery.ToListAsync(cancellationToken);

        if (!locations.Any())
            return Error.NotFound("Itinerary.NoLocations", "No locations found for the specified destinations.");

        var visitedLocationIds = new HashSet<int>();
        var currentLat = request.StartLat;
        var currentLon = request.StartLon;

        int totalDays = (request.EndDate.Date - request.StartDate.Date).Days + 1;
        // Total slots: 4 per day
        double totalSlots = totalDays * 4;
        double baseActivityBudget = result.BudgetBreakdown.ActivitiesAllocation / totalSlots;

        for (var date = request.StartDate.Date; date <= request.EndDate.Date; date = date.AddDays(1))
        {
            var dayDto = new ItineraryDayDto { Date = date };
            var timeBlocks = new[] { "Morning", "Lunch", "Afternoon", "Evening" };

            foreach (var block in timeBlocks)
            {
                var bestLocation = await FindNextBestLocationAsync(
                    locations,
                    visitedLocationIds,
                    request.Tags,
                    currentLat,
                    currentLon,
                    date,
                    baseActivityBudget);

                if (bestLocation != null)
                {
                    var route = await _distanceService.GetRouteInfoAsync(currentLat, currentLon, bestLocation.Latitude, bestLocation.Longitude);

                    dayDto.Items.Add(new ItineraryItemDto
                    {
                        TimeBlock = block,
                        ScheduledTime = date, 
                        LocationId = bestLocation.Id,
                        ActivityName = bestLocation.Name,
                        EstimatedCost = bestLocation.AverageBudget,
                        DurationMinutes = bestLocation.AverageStayDuration,
                        DistanceToNext = route.DistanceKm,
                        TravelTimeToNext = route.DurationMinutes
                    });

                    visitedLocationIds.Add(bestLocation.Id);
                    currentLat = bestLocation.Latitude;
                    currentLon = bestLocation.Longitude;
                }
            }

            result.Days.Add(dayDto);
        }

        return result;
    }

    private BudgetBreakdownDto PartitionBudget(double totalBudget)
    {
        double contingencyFund = totalBudget * 0.10;
        double remaining = totalBudget - contingencyFund;

        return new BudgetBreakdownDto
        {
            TotalBudget = totalBudget,
            ContingencyFund = contingencyFund,
            TransportAllocation = remaining * 0.30,
            AccommodationAllocation = remaining * 0.40,
            ActivitiesAllocation = remaining * 0.30
        };
    }

    private async Task<double> CalculateLocationScore(
        Location loc,
        List<string> preferences,
        double currentLat,
        double currentLon,
        DateTime date,
        double idealCost)
    {
        // TagMatch (0.4)
        double tagMatch = preferences.Any()
            ? (double)loc.Tags.Intersect(preferences).Count() / preferences.Count
            : 0.5;

        // TimeFit (0.3) - Based on distance
        double dist = Math.Sqrt(Math.Pow(loc.Latitude - currentLat, 2) + Math.Pow(loc.Longitude - currentLon, 2)) * 111;
        double timeFit = 1.0 / (1.0 + dist / 20.0);

        // WeatherScore (0.2)
        double weatherScore = await _weatherService.GetWeatherFactorAsync(loc.Latitude, loc.Longitude, date);

        // CostFit (0.1)
        double costFit = loc.AverageBudget <= idealCost ? 1.0 : idealCost / loc.AverageBudget;

        return (tagMatch * 0.4) + (timeFit * 0.3) + (weatherScore * 0.2) + (costFit * 0.1);
    }

    private async Task<Location?> FindNextBestLocationAsync(
        List<Location> locations,
        HashSet<int> visitedIds,
        List<string> preferences,
        double currentLat,
        double currentLon,
        DateTime date,
        double idealCost)
    {
        Location? best = null;
        double highestScore = -1;

        foreach (var loc in locations.Where(l => !visitedIds.Contains(l.Id)))
        {
            double score = await CalculateLocationScore(loc, preferences, currentLat, currentLon, date, idealCost);

            if (score > highestScore)
            {
                highestScore = score;
                best = loc;
            }
        }

        return best;
    }
}
