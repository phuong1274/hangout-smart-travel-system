namespace HSTS.Application.TransitHubManagement
{
    public static class TransitHubMappingExtensions
    {
        public static TransitHubDto ToDto(this Domain.Entities.TransitHubs entity)
        {
            return new TransitHubDto(
                entity.Id,
                entity.Code,
                entity.Name,
                entity.Latitude,
                entity.Longitude,
                entity.DistrictId,
                entity.District?.Name,
                entity.TransportationId,
                entity.TransportMode?.Name,
                entity.TransitHubTypeId,
                entity.TransitHubType?.Name,
                entity.CreatedAt,
                entity.UpdatedAt);
        }
    }
}
