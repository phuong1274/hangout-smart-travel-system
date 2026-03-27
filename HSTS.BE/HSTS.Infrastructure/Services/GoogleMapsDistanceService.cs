using HSTS.Application.Interfaces;
using HSTS.Application.Itineraries.Common;
using System;
using System.Threading.Tasks;

namespace HSTS.Infrastructure.Services;

public class GoogleMapsDistanceService : IDistanceService
{
    // TODO: Implement Google Maps API integration
    // private readonly string _apiKey = "YOUR_API_KEY";

    public async Task<RouteInfo> GetRouteInfoAsync(double lat1, double lon1, double lat2, double lon2)
    {
        // Fallback: Haversine Formula
        double distance = CalculateHaversineDistance(lat1, lon1, lat2, lon2);
        
        // Assume average speed of 40km/h for duration estimate
        int duration = (int)(distance / 40.0 * 60.0);

        return new RouteInfo(Math.Round(distance, 2), duration);
    }

    private double CalculateHaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        var R = 6371; // Radius of the earth in km
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        var d = R * c; 
        return d;
    }

    private double ToRadians(double deg) => deg * (Math.PI / 180);
}
