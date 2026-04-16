using HSTS.Application.Locations;

namespace HSTS.Application.Home;

public record HomeSocialProofStatDto(
    string Key,
    string Label,
    int Value,
    string SupportCopy,
    bool HasRealValue = true);

public record HomeSocialProofDto(
    string Title,
    string Description,
    IReadOnlyList<HomeSocialProofStatDto> Stats,
    bool HasRealData = true);

public record HomeDiscoveryDto(
    IReadOnlyList<PublicDestinationDto> FeaturedDestinations,
    IReadOnlyList<PublicLocationCardDto> PopularLocations,
    HomeSocialProofDto? SocialProof = null);
