using System;
using System.Threading.Tasks;

namespace HSTS.Application.Interfaces
{
    public interface IWeatherService
    {
        Task<double> GetWeatherFactorAsync(double lat, double lon, DateTime date);
    }
}
