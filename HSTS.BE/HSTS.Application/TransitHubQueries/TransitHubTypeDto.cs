namespace HSTS.Application.TransitHubQueries
{
    public record TransitHubTypeDto(int Id, string Name);

    public static class TransitHubTypeMappingExtensions
    {
        public static TransitHubTypeDto ToDto(this TransitHubType transitHubType)
        {
            return new TransitHubTypeDto(transitHubType.Id, transitHubType.Name);
        }
    }
}
