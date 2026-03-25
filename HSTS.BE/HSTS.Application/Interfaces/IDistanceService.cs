using System.Threading.Tasks;
using HSTS.Application.Itineraries.Common;

namespace HSTS.Application.Interfaces
{
    public interface IDistanceService
    {
        Task<RouteInfo> GetRouteInfoAsync(double startLat, double startLon, double endLat, double endLon, string mode);
    }
}
