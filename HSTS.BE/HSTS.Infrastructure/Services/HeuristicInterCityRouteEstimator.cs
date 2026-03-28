using HSTS.Application.Itineraries.Interfaces;
using HSTS.Application.Interfaces;
using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Infrastructure.Services
{
    internal class HeuristicInterCityRouteEstimator : IInterCityRouteEstimator
    {
        private readonly IAppDbContext _context;

        public HeuristicInterCityRouteEstimator(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<RouteEstimate> EstimateAsync(
            Province fromProvince,
            Province toProvince,
            int groupSize,
            CancellationToken cancellationToken = default)
        {
            var distanceKm = CalculateDistanceKm(
                (double)fromProvince.Latitude,
                (double)fromProvince.Longitude,
                (double)toProvince.Latitude,
                (double)toProvince.Longitude);

            var transportModes = await _context.TransportModes
                .Include(x => x.Pricing)
                .Where(x => !x.IsDeleted)
                .ToListAsync(cancellationToken);

            var selectedCategory = SelectCategory(distanceKm, groupSize);
            var selectedMode = transportModes
                .Where(x => x.Category == selectedCategory)
                .OrderBy(x => x.Pricing?.CostPerKm ?? decimal.MaxValue)
                .FirstOrDefault();

            if (selectedMode is null)
            {
                selectedMode = transportModes.FirstOrDefault();
            }

            var method = selectedMode?.Name ?? DefaultMethodName(selectedCategory);
            var perPersonBaseCost = GetBracketCostPerPerson(distanceKm, selectedCategory);

            if (selectedMode?.Pricing is not null && selectedMode.Pricing.CostPerKm > 0)
            {
                var kmCost = selectedMode.Pricing.CostPerKm * (decimal)Math.Max(1d, distanceKm);
                perPersonBaseCost = decimal.Min(decimal.Max(kmCost, perPersonBaseCost * 0.6m), perPersonBaseCost * 2.2m);
            }

            var totalCost = decimal.Round(perPersonBaseCost * groupSize, 2, MidpointRounding.AwayFromZero);

            var speed = selectedMode?.Pricing?.SpeedKmh ?? DefaultSpeed(selectedCategory);
            var travelHours = Math.Max(0.3d, distanceKm / Math.Max(1d, speed));
            var overheadMinutes = selectedCategory == TransportCategory.Air ? 150 : 30;
            var travelMinutes = (int)Math.Ceiling((travelHours * 60d) + overheadMinutes);

            var departureHub = await ResolveHubNameAsync(fromProvince.Id, selectedMode?.Id, cancellationToken);
            var arrivalHub = await ResolveHubNameAsync(toProvince.Id, selectedMode?.Id, cancellationToken);

            var description = $"{method} from {fromProvince.Name} to {toProvince.Name}";
            var pros = selectedCategory switch
            {
                TransportCategory.Air => "Fastest option for long-distance travel.",
                TransportCategory.Rail => "Stable schedule and good comfort-to-cost balance.",
                _ => "Cost-effective for short and medium distances."
            };

            var cons = selectedCategory switch
            {
                TransportCategory.Air => "Highest cost and airport transfer overhead.",
                TransportCategory.Rail => "Less flexible departure times than road travel.",
                _ => "Slower than rail or air for long distances."
            };

            if (!string.IsNullOrWhiteSpace(departureHub) && !string.IsNullOrWhiteSpace(arrivalHub))
            {
                description = $"{method} from {departureHub} ({fromProvince.Name}) to {arrivalHub} ({toProvince.Name})";
            }

            return new RouteEstimate(
                method,
                description,
                departureHub,
                arrivalHub,
                totalCost,
                travelMinutes,
                pros,
                cons,
                Math.Round(distanceKm, 2));
        }

        private async Task<string?> ResolveHubNameAsync(int provinceId, int? transportModeId, CancellationToken cancellationToken)
        {
            if (transportModeId is null)
            {
                return null;
            }

            return await _context.TransitHubs
                .Where(x => x.ProvinceId == provinceId && x.TransportModeId == transportModeId.Value && !x.IsDeleted)
                .OrderBy(x => x.Name)
                .Select(x => x.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private static TransportCategory SelectCategory(double distanceKm, int groupSize)
        {
            if (distanceKm > 1000d)
            {
                return TransportCategory.Air;
            }

            if (distanceKm > 600d)
            {
                return groupSize > 4 ? TransportCategory.Air : TransportCategory.Rail;
            }

            if (distanceKm > 300d)
            {
                return TransportCategory.Rail;
            }

            return TransportCategory.InterCity;
        }

        private static decimal GetBracketCostPerPerson(double distanceKm, TransportCategory category)
        {
            if (category == TransportCategory.Air)
            {
                return distanceKm > 1000d ? 1_800_000m : 1_000_000m;
            }

            if (distanceKm < 150d) return 200_000m;
            if (distanceKm < 300d) return 400_000m;
            if (distanceKm < 600d) return 650_000m;
            return 1_000_000m;
        }

        private static double DefaultSpeed(TransportCategory category)
        {
            return category switch
            {
                TransportCategory.Air => 700d,
                TransportCategory.Rail => 70d,
                _ => 45d
            };
        }

        private static string DefaultMethodName(TransportCategory category)
        {
            return category switch
            {
                TransportCategory.Air => "Airplane",
                TransportCategory.Rail => "Train",
                _ => "Coach"
            };
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
    }
}