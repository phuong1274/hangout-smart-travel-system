using HSTS.Domain.Entities;

namespace HSTS.Application.LocationMedias
{
    public static class LocationMediaMappingExtensions
    {
        public static LocationMediaDto ToDto(this LocationMedia media)
        {
            return new LocationMediaDto(media.Id, media.Link, media.LocationId);
        }
    }
}
