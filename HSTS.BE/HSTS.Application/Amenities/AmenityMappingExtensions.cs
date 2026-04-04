using HSTS.Domain.Entities;

namespace HSTS.Application.Amenities
{
    public static class AmenityMappingExtensions
    {
        public static AmenityDto ToDto(this Amenity amenity)
        {
            return new AmenityDto(
                amenity.Id,
                amenity.Name,
                amenity.Description,
                amenity.CreatedAt,
                amenity.UpdatedAt
            );
        }
    }
}
