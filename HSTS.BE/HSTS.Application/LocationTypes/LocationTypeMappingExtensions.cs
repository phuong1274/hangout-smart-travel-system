using HSTS.Domain.Entities;

namespace HSTS.Application.LocationTypes
{
    public static class LocationTypeMappingExtensions
    {
        public static LocationTypeDto ToDto(this LocationType locationType)
        {
            return new LocationTypeDto(
                locationType.Id,
                locationType.Name,
                locationType.CreatedAt,
                locationType.UpdatedAt
            );
        }
    }
}
