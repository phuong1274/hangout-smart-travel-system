using FluentAssertions;
using HSTS.Application.Itineraries.Queries;

namespace HSTS.Tests.Itineraries;

public class CurrencyValidatorTests
{
    [Theory]
    [InlineData("USD", true)]
    [InlineData("VND", true)]
    [InlineData("US", false)]
    [InlineData("USDT", false)]
    public void GenerateItineraryValidator_CurrencyCode_RequiresIso4217Length(
        string currencyCode,
        bool expectedValid)
    {
        var validator = new GenerateItineraryQueryValidator();
        var query = new GenerateItineraryQuery(new TripPlanRequest
        {
            UserLocation = new UserLocation { Latitude = 10, Longitude = 106 },
            Destinations = new List<DestinationRequest> { new() { ProvinceId = 1 } },
            CurrencyCode = currencyCode,
            GroupSize = 2,
            TotalBudget = 1_000,
            StartDate = DateOnly.FromDateTime(DateTime.Today),
            EndDate = DateOnly.FromDateTime(DateTime.Today),
            TripSegment = "Standard",
        });

        var result = validator.Validate(query);

        result.IsValid.Should().Be(expectedValid);
    }

    [Theory]
    [InlineData("EUR", true)]
    [InlineData("VND", true)]
    [InlineData("EU", false)]
    [InlineData("EURO", false)]
    public void EstimateLocalTravelValidator_CurrencyCode_RequiresIso4217Length(
        string currencyCode,
        bool expectedValid)
    {
        var validator = new EstimateLocalTravelQueryValidator();
        var query = new EstimateLocalTravelQuery(
            FromLocationId: null,
            FromTransitHubId: null,
            FromCustomLocationId: null,
            FromCustomTransitHubId: null,
            FromLat: 10,
            FromLng: 106,
            ToLocationId: null,
            ToTransitHubId: null,
            ToCustomLocationId: null,
            ToCustomTransitHubId: null,
            ToLat: 11,
            ToLng: 107,
            GroupSize: 2,
            DepartureTime: null,
            CurrencyCode: currencyCode);

        var result = validator.Validate(query);

        result.IsValid.Should().Be(expectedValid);
    }
}
