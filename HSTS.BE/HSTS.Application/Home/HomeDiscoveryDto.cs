using HSTS.Application.Locations;

namespace HSTS.Application.Home;

public record HomeDiscoveryDto(
    IReadOnlyList<PublicDestinationDto> FeaturedDestinations,
    IReadOnlyList<PublicLocationCardDto> PopularLocations);
