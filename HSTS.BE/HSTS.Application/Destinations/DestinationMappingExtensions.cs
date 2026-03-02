using HSTS.Application.Destinations;
using HSTS.Domain.Entities;

namespace HSTS.Application.Destinations
{
    public static class DestinationMappingExtensions
    {
        public static DestinationDto ToDto(this Destination destination)
        {
            return new DestinationDto(destination.Id, destination.Name);
        }
    }
}
