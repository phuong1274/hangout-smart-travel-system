using System.Threading.Tasks;

namespace HSTS.Application.Interfaces
{
    public interface IPlaceService
    {
        Task SyncPlaceDetailsAsync(string placeId);
    }
}
