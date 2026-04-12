using FluentAssertions;
using HSTS.Application.Dashboard.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Dashboard;

public class GetAdminDashboardSummaryQueryTests
{
    [Fact]
    public async Task Handle_ReturnsCoreKpis()
    {
        var province1 = new Province { Id = 1, Name = "Ha Noi", CountryId = "VN", IsDeleted = false };
        var province2 = new Province { Id = 2, Name = "Da Nang", CountryId = "VN", IsDeleted = false };

        var district1 = new District { Id = 11, Name = "Ba Dinh", ProvinceId = 1, Province = province1, IsDeleted = false };
        var district2 = new District { Id = 22, Name = "Hai Chau", ProvinceId = 2, Province = province2, IsDeleted = false };

        var location1 = new Location { Id = 101, Name = "Temple", Address = "A", Latitude = 1, Longitude = 1, TicketPrice = 0, DistrictId = 11, District = district1, Status = LocationStatus.Active, IsDeleted = false };
        var location2 = new Location { Id = 102, Name = "Beach", Address = "B", Latitude = 1, Longitude = 1, TicketPrice = 0, DistrictId = 22, District = district2, Status = LocationStatus.Active, IsDeleted = false };

        var trip1 = new Trip { Id = 1, TripName = "Trip 1", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), GroupSize = 2, UserId = 1, Currency = "VND", Status = TripStatus.Planned, IsDeleted = false };
        var trip2 = new Trip { Id = 2, TripName = "Trip 2", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(2), GroupSize = 2, UserId = 1, Currency = "VND", Status = TripStatus.Completed, IsDeleted = false };

        var ctx = MockDbContextFactory.Create()
            .WithProvinces(province1, province2)
            .WithDistricts(district1, district2)
            .WithLocations(location1, location2)
            .WithLocationReviews(
                new LocationReview { Id = 1, LocationId = 101, UserId = 1, Rating = 5, Comment = "great", Status = LocationReviewStatus.Visible, IsDeleted = false },
                new LocationReview { Id = 2, LocationId = 102, UserId = 2, Rating = 4, Comment = "nice", Status = LocationReviewStatus.Visible, IsDeleted = false })
            .WithTrips(trip1, trip2)
            .Build();

        var handler = new GetAdminDashboardSummaryQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetAdminDashboardSummaryQuery(), default);

        result.IsError.Should().BeFalse();
        result.Value.TotalDestinations.Should().Be(2);
        result.Value.TotalProvinces.Should().Be(2);
        result.Value.TotalLocations.Should().Be(2);
        result.Value.TotalReviews.Should().Be(2);
        result.Value.TotalItinerariesCreated.Should().Be(2);
        result.Value.TotalItinerariesCompleted.Should().Be(1);
    }
}
