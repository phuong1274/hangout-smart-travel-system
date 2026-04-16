using FluentAssertions;
using HSTS.Application.Dashboard.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Dashboard;

public class GetAdminDashboardTrendsQueryTests
{
    [Fact]
    public async Task Handle_ReturnsNonEmptyLocationTrend_WhenDataExists()
    {
        var now = DateTime.UtcNow;

        var province = new Province { Id = 1, Name = "Ha Noi", CountryId = "VN", IsDeleted = false };
        var district = new District { Id = 11, Name = "Ba Dinh", ProvinceId = 1, Province = province, IsDeleted = false };

        var location1 = new Location { Id = 1, Name = "A", Address = "A", Latitude = 1, Longitude = 1, TicketPrice = 0, DistrictId = 11, District = district, Status = LocationStatus.Active, IsDeleted = false, CreatedAt = now.AddMonths(-1) };
        var location2 = new Location { Id = 2, Name = "B", Address = "B", Latitude = 1, Longitude = 1, TicketPrice = 0, DistrictId = 11, District = district, Status = LocationStatus.Active, IsDeleted = false, CreatedAt = now };

        var review1 = new LocationReview { Id = 1, LocationId = 1, UserId = 1, Rating = 5, Comment = "good", Status = LocationReviewStatus.Visible, IsDeleted = false, CreatedAt = now.AddMonths(-1) };
        var review2 = new LocationReview { Id = 2, LocationId = 2, UserId = 2, Rating = 4, Comment = "nice", Status = LocationReviewStatus.Visible, IsDeleted = false, CreatedAt = now };

        var trip1 = new Trip { Id = 1, TripName = "T1", StartDate = now, EndDate = now.AddDays(1), GroupSize = 2, Currency = "VND", Status = TripStatus.Planned, IsDeleted = false, CreatedAt = now.AddMonths(-1) };
        var trip2 = new Trip { Id = 2, TripName = "T2", StartDate = now, EndDate = now.AddDays(2), GroupSize = 2, Currency = "VND", Status = TripStatus.Completed, IsDeleted = false, CreatedAt = now };

        var ctx = MockDbContextFactory.Create()
            .WithProvinces(province)
            .WithDistricts(district)
            .WithLocations(location1, location2)
            .WithLocationReviews(review1, review2)
            .WithTrips(trip1, trip2)
            .Build();

        var handler = new GetAdminDashboardTrendsQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetAdminDashboardTrendsQuery(3), default);

        result.IsError.Should().BeFalse();
        result.Value.LocationGrowth.Should().NotBeEmpty();
        result.Value.LocationGrowth.Sum(x => x.Value).Should().BeGreaterThan(0);
        result.Value.ReviewGrowth.Sum(x => x.Value).Should().BeGreaterThan(0);
        result.Value.TripGrowth.Sum(x => x.Value).Should().BeGreaterThan(0);
    }
}
