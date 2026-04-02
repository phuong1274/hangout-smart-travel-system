using HSTS.Domain.Entities;

namespace HSTS.Application.LocationClosures
{
    public static class LocationClosureMappingExtensions
    {
        public static LocationClosureDto ToDto(this LocationClosure closure)
        {
            return new LocationClosureDto(
                closure.Id,
                closure.LocationId,
                closure.StartDate,
                closure.EndDate,
                closure.Reason,
                closure.IsActive,
                closure.CreatedAt,
                closure.UpdatedAt
            );
        }
    }
}
