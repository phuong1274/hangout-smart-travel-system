using HSTS.Domain.Entities;

namespace HSTS.Application.Districts
{
    public static class DistrictMappingExtensions
    {
        public static DistrictDto ToDto(this District district)
        {
            return new DistrictDto(
                district.Id,
                district.Name,
                district.EnglishName,
                district.Latitude,
                district.Longitude,
                district.ProvinceId,
                district.Province?.Name,
                district.CreatedAt,
                district.UpdatedAt
            );
        }
    }
}
