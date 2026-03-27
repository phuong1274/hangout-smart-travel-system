using System.Threading.Tasks;
using HSTS.Application.Itineraries.Common;

namespace HSTS.Application.Interfaces
{
    public interface IDistanceService
    {
        Task<RouteInfo> GetRouteInfoAsync(double lat1, double lon1, double lat2, double lon2);
    }
}
