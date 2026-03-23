using HSTS.Application.Destinations;
using HSTS.Domain.Entities;

namespace HSTS.Application.Destinations
{
    public static class DestinationMappingExtensions
    {
        public static DestinationDto ToDto(this Destination destination)
        {
            return new DestinationDto(
                destination.Id,
                destination.Name,
                destination.EnglishName,
                destination.Code,
                destination.Latitude,
                destination.Longitude,
                destination.StateId,
                destination.State?.Name,
                destination.CountryId,
                destination.Country?.Name,
                destination.CreatedAt,
                destination.UpdatedAt
            );
        }
    }
}
