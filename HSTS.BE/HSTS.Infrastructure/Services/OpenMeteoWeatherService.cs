using HSTS.Application.Interfaces;
using System;
using System.Threading.Tasks;

namespace HSTS.Infrastructure.Services;

public class OpenMeteoWeatherService : IWeatherService
{
    // TODO: Implement Open-Meteo API request logic
    
    public async Task<double> GetWeatherFactorAsync(double lat, double lon, DateTime date)
    {
        // Placeholder: 1.0 means perfect weather (score 0.0 - 1.0)
        return 1.0;
    }
}
