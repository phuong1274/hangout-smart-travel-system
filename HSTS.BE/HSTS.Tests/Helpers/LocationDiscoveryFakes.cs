using HSTS.Domain.Entities;
using HSTS.Domain.Enums;

namespace HSTS.Tests.Helpers;

public static class LocationDiscoveryFakes
{
    public static Province Province(int id, string name, string countryId = "VN") =>
        new()
        {
            Id = id,
            Name = name,
            EnglishName = name,
            CountryId = countryId
        };

    public static District District(int id, string name, int provinceId) =>
        new()
        {
            Id = id,
            Name = name,
            EnglishName = name,
            ProvinceId = provinceId
        };

    public static Location PublishedLocation(int id, string name, int districtId, decimal score = 4.5m) =>
        new()
        {
            Id = id,
            Name = name,
            DistrictId = districtId,
            Address = "123 Discovery Street",
            Latitude = 10.0,
            Longitude = 106.0,
            TicketPrice = 0,
            MinimumAge = 0,
            Score = score,
            Status = LocationStatus.Active,
            IsDeleted = false
        };
}
