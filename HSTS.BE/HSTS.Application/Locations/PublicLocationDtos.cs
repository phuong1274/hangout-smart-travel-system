using System;
using System.Collections.Generic;

namespace HSTS.Application.Locations;

public record PublicDestinationDto(
    int Id,
    string Name,
    int LocationCount);

public record PublicLocationTypeDto(
    int Id,
    string Name);

public record PublicTagDto(
    int Id,
    string Name,
    int Level,
    int? ParentTagId);

public record PublicAmenityDto(
    int Id,
    string Name,
    string? Description);

public record PublicOpeningHourDto(
    DayOfWeek DayOfWeek,
    TimeSpan? OpenTime,
    TimeSpan? CloseTime,
    string? Note);

public record PublicSeasonDto(
    string Description,
    string Months);

public record PublicSocialLinkDto(
    string Platform,
    string Url);

public record PublicLocationCardDto(
    int Id,
    string Name,
    string Destination,
    string District,
    string Address,
    string? Description,
    decimal? AverageRating,
    int ReviewCount,
    string? ImageUrl,
    PublicLocationTypeDto? LocationType,
    IReadOnlyList<PublicTagDto> Tags,
    decimal? PriceMinUsd,
    decimal? PriceMaxUsd,
    decimal? TicketPrice,
    int? RecommendedDurationMinutes,
    string Status);

public record PublicLocationDetailDto(
    int Id,
    string Name,
    string Destination,
    string District,
    string Address,
    string? Description,
    decimal? AverageRating,
    int ReviewCount,
    IReadOnlyList<string> ImageUrls,
    PublicLocationTypeDto? LocationType,
    IReadOnlyList<PublicTagDto> Tags,
    IReadOnlyList<PublicAmenityDto> Amenities,
    IReadOnlyList<PublicOpeningHourDto> OpeningHours,
    IReadOnlyList<PublicSeasonDto> Seasons,
    decimal? PriceMinUsd,
    decimal? PriceMaxUsd,
    decimal? TicketPrice,
    int? RecommendedDurationMinutes,
    int MinimumAge,
    double Latitude,
    double Longitude,
    string? Telephone,
    string? Email,
    string? SourceUrl,
    string Status,
    IReadOnlyList<PublicSocialLinkDto> SocialLinks);

public record PublicLocationPagedResponse(
    IReadOnlyList<PublicLocationCardDto> Items,
    int TotalCount,
    int PageIndex,
    int PageSize);

public static class PublicLocationDtoMappings
{
    public static PublicTagDto ToPublicTagDto(this HSTS.Domain.Entities.Tag tag) =>
        new(tag.Id, tag.Name, tag.Level, tag.ParentTagId);

    public static PublicLocationTypeDto ToPublicLocationTypeDto(this HSTS.Domain.Entities.LocationType type) =>
        new(type.Id, type.Name);

    public static PublicAmenityDto ToPublicAmenityDto(this HSTS.Domain.Entities.Amenity amenity) =>
        new(amenity.Id, amenity.Name, amenity.Description);
}
