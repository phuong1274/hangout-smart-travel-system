using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Itineraries.Queries
{
    public record EstimateLocalTravelQuery(
        int FromLocationId,
        int ToLocationId,
        int GroupSize,
        TimeOnly DepartureTime,
        string CurrencyCode) : IRequest<ErrorOr<LocationToLocationTravelLegDto>>;

    public class EstimateLocalTravelQueryValidator : AbstractValidator<EstimateLocalTravelQuery>
    {
        public EstimateLocalTravelQueryValidator()
        {
            RuleFor(x => x.FromLocationId).GreaterThan(0);
            RuleFor(x => x.ToLocationId).GreaterThan(0);
            RuleFor(x => x.GroupSize).GreaterThan(0);
            RuleFor(x => x.CurrencyCode).NotEmpty().MaximumLength(5);
        }
    }

    public class EstimateLocalTravelQueryHandler : IRequestHandler<EstimateLocalTravelQuery, ErrorOr<LocationToLocationTravelLegDto>>
    {
        private const double DefaultSpeedKmh = 35.0;

        private readonly IAppDbContext _context;
        private readonly IRouteMatrixService _routeMatrixService;
        private readonly ICurrencyService _currencyService;

        public EstimateLocalTravelQueryHandler(
            IAppDbContext context,
            IRouteMatrixService routeMatrixService,
            ICurrencyService currencyService)
        {
            _context = context;
            _routeMatrixService = routeMatrixService;
            _currencyService = currencyService;
        }

        public async Task<ErrorOr<LocationToLocationTravelLegDto>> Handle(
            EstimateLocalTravelQuery request,
            CancellationToken cancellationToken)
        {
            var locations = await _context.Locations
                .AsNoTracking()
                .Where(x => x.Id == request.FromLocationId || x.Id == request.ToLocationId)
                .ToListAsync(cancellationToken);

            var fromLocation = locations.FirstOrDefault(x => x.Id == request.FromLocationId);
            var toLocation = locations.FirstOrDefault(x => x.Id == request.ToLocationId);

            if (fromLocation is null)
                return Error.NotFound("Location.NotFound", $"FromLocationId {request.FromLocationId} not found.");
            
            if (toLocation is null)
                return Error.NotFound("Location.NotFound", $"ToLocationId {request.ToLocationId} not found.");

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

            var transportModes = await _context.TransportModes
                .AsNoTracking()
                .Include(x => x.LocalTransportMetrics)
                .Where(x => x.Category == CategoryTransport.DynamicLocal && x.LocalTransportMetrics != null)
                .ToListAsync(cancellationToken);

            RouteEstimate? routeEstimate = null;
            try
            {
                routeEstimate = await _routeMatrixService.EstimateAsync(
                    fromLocation.Latitude, fromLocation.Longitude, 
                    toLocation.Latitude, toLocation.Longitude, 
                    cancellationToken);
            }
            catch { /* route estimate failed, use haversine */ }

            var distanceKm = routeEstimate?.DistanceKm ?? HaversineKm(
                fromLocation.Latitude, fromLocation.Longitude, 
                toLocation.Latitude, toLocation.Longitude);

            if (double.IsInfinity(distanceKm) || double.IsNaN(distanceKm) || distanceKm > 10_000) 
            {
                distanceKm = 50.0;
            }

            var fallbackDuration = Math.Max(10, (int)Math.Round(distanceKm / DefaultSpeedKmh * 60d));

            var candidates = transportModes
                .Select(x =>
                {
                    var metrics = x.LocalTransportMetrics!;
                    var speedKmh = Math.Max(1d, (double)metrics.SpeedKmh);
                    var timeMinutes = Math.Max(5, (int)Math.Round(distanceKm / speedKmh * 60d));
                    var vehicleCount = (int)Math.Ceiling(request.GroupSize / (double)Math.Max(1, x.Capacity));
                    var totalCost = (decimal)distanceKm * metrics.CostPerKm * vehicleCount;
                    var maxDist = metrics.MaxRecommendedDistance.HasValue ? (double)metrics.MaxRecommendedDistance.Value : double.PositiveInfinity;
                    var over = distanceKm - maxDist;
                    var penalty = over > 0 ? over * over * 5d : 0d;
                    var score = timeMinutes * 0.55d + (double)totalCost * 0.00035d + penalty;
                    var note = over > 0 ? "Exceeds recommended distance" : "Within recommended distance";
                    
                    return new 
                    {
                        TransportModeId = x.Id,
                        Method = x.Name,
                        EstimatedTravelMinutes = timeMinutes,
                        EstimatedTotalCost = totalCost,
                        Score = score,
                        Note = note,
                        VehiclesNeeded = vehicleCount
                    };
                })
                .OrderBy(x => x.Score)
                .ToList();

            var inRange = candidates.Where(c => c.Note == "Within recommended distance").ToList();
            if (inRange.Count > 0) candidates = inRange.Concat(candidates.Except(inRange)).ToList();

            var transportOptions = new List<TransportOptionDto>();

            if (candidates.Count == 0)
            {
                var unknownOpt = new TransportOptionDto(0, "Unknown", fallbackDuration, toMoney(0), true,
                    "No local transport data available", null, null, null, null, 1, toMoney(0));
                transportOptions.Add(unknownOpt);
            }
            else
            {
                transportOptions = candidates.Take(4).Select((x, idx) => new TransportOptionDto(
                    x.TransportModeId, x.Method, x.EstimatedTravelMinutes, toMoney(x.EstimatedTotalCost), 
                    idx == 0, x.Note, null, null, null, null,
                    x.VehiclesNeeded, toMoney(x.EstimatedTotalCost))).ToList();
            }

            var selectedOption = transportOptions.First(o => o.Recommended);
            var arrivalTime = request.DepartureTime.Add(TimeSpan.FromMinutes(selectedOption.EstimatedTravelMinutes));

            var travelLeg = new LocationToLocationTravelLegDto(
                fromLocation.Id,
                fromLocation.Name,
                toLocation.Id,
                toLocation.Name,
                request.DepartureTime,
                arrivalTime,
                Math.Round(distanceKm, 2),
                selectedOption.Method,
                selectedOption.EstimatedTravelMinutes,
                selectedOption.EstimatedTotalCost,
                transportOptions);

            return travelLeg;
        }

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
    }
}
