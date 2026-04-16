using FluentAssertions;
using HSTS.Application.Dashboard.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Dashboard;

public class GetAdminDashboardInsightsQueryTests
{
    [Fact]
    public async Task Handle_ReturnsMonthlyInsights_WithMonthBoundaryFiltering()
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var inMonth = monthStart.AddDays(5);
        var previousMonth = monthStart.AddDays(-1);
        var nextMonth = monthStart.AddMonths(1).AddDays(1);

        var province = new Province { Id = 1, Name = "Ha Noi", CountryId = "VN", IsDeleted = false };
        var district = new District { Id = 11, Name = "Ba Dinh", ProvinceId = 1, Province = province, IsDeleted = false };

        var location1 = new Location
        {
            Id = 1,
            Name = "A",
            Address = "A",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 11,
            District = district,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = inMonth
        };

        var location2 = new Location
        {
            Id = 2,
            Name = "B",
            Address = "B",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 11,
            District = district,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = inMonth.AddDays(1)
        };

        var locationOutOfMonth = new Location
        {
            Id = 3,
            Name = "C",
            Address = "C",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 11,
            District = district,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = previousMonth
        };

        var review = new LocationReview
        {
            Id = 1,
            LocationId = 1,
            UserId = 1,
            Rating = 5,
            Comment = "good",
            Status = LocationReviewStatus.Visible,
            IsDeleted = false,
            CreatedAt = inMonth
        };

        var pendingReport = new LocationReviewReport
        {
            Id = 1,
            LocationReviewId = 1,
            ReporterUserId = 2,
            Reason = LocationReviewReportReason.Other,
            Status = LocationReviewReportStatus.Pending,
            IsDeleted = false,
            CreatedAt = inMonth
        };

        var resolvedReport = new LocationReviewReport
        {
            Id = 2,
            LocationReviewId = 1,
            ReporterUserId = 3,
            Reason = LocationReviewReportReason.Spam,
            Status = LocationReviewReportStatus.Resolved,
            IsDeleted = false,
            CreatedAt = inMonth
        };

        var outOfMonthReport = new LocationReviewReport
        {
            Id = 3,
            LocationReviewId = 1,
            ReporterUserId = 4,
            Reason = LocationReviewReportReason.Other,
            Status = LocationReviewReportStatus.Resolved,
            IsDeleted = false,
            CreatedAt = previousMonth
        };

        var approvedSubmission = new LocationSubmission
        {
            Id = 1,
            UserId = 1,
            Name = "Approved",
            Address = "A",
            Latitude = 1,
            Longitude = 1,
            Status = SubmissionStatus.Approved,
            IsDeleted = false,
            ReviewedAt = inMonth
        };

        var rejectedSubmission = new LocationSubmission
        {
            Id = 2,
            UserId = 1,
            Name = "Rejected",
            Address = "B",
            Latitude = 1,
            Longitude = 1,
            Status = SubmissionStatus.Rejected,
            IsDeleted = false,
            ReviewedAt = inMonth
        };

        var outOfMonthSubmission = new LocationSubmission
        {
            Id = 3,
            UserId = 1,
            Name = "Old Approved",
            Address = "C",
            Latitude = 1,
            Longitude = 1,
            Status = SubmissionStatus.Approved,
            IsDeleted = false,
            ReviewedAt = previousMonth
        };

        var tripCreatedThisMonth = new Trip
        {
            Id = 1,
            TripName = "T1",
            StartDate = inMonth,
            EndDate = inMonth.AddDays(1),
            GroupSize = 2,
            Currency = "VND",
            Status = TripStatus.Planned,
            IsDeleted = false,
            CreatedAt = inMonth
        };

        var tripCompletedThisMonth = new Trip
        {
            Id = 2,
            TripName = "T2",
            StartDate = previousMonth,
            EndDate = inMonth,
            GroupSize = 2,
            Currency = "VND",
            Status = TripStatus.Completed,
            IsDeleted = false,
            CreatedAt = previousMonth
        };

        var tripOutOfMonth = new Trip
        {
            Id = 3,
            TripName = "T3",
            StartDate = inMonth,
            EndDate = nextMonth,
            GroupSize = 2,
            Currency = "VND",
            Status = TripStatus.Completed,
            IsDeleted = false,
            CreatedAt = inMonth
        };

        var ctx = MockDbContextFactory.Create()
            .WithProvinces(province)
            .WithDistricts(district)
            .WithLocations(location1, location2, locationOutOfMonth)
            .WithLocationReviews(review)
            .WithLocationReviewReports(pendingReport, resolvedReport, outOfMonthReport)
            .WithLocationSubmissions(approvedSubmission, rejectedSubmission, outOfMonthSubmission)
            .WithTrips(tripCreatedThisMonth, tripCompletedThisMonth, tripOutOfMonth)
            .Build();

        var handler = new GetAdminDashboardInsightsQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetAdminDashboardInsightsQuery(), default);

        result.IsError.Should().BeFalse();
        result.Value.TripsCreatedThisMonth.Should().Be(2);
        result.Value.TripsCompletedThisMonth.Should().Be(1);
        result.Value.LocationsAddedThisMonth.Should().Be(2);
        result.Value.ApprovedSubmissionsThisMonth.Should().Be(1);
        result.Value.RejectedSubmissionsThisMonth.Should().Be(1);
        result.Value.AvgReviewsPerActiveLocation.Should().Be(0.33m);
        result.Value.LocationsWithoutReviews.Should().Be(2);
        result.Value.ModerationResolutionRate.Should().Be(50m);
    }

    [Fact]
    public async Task Handle_ReturnsZeroAvgReviewsPerActiveLocation_WhenNoActiveLocations()
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var province = new Province { Id = 1, Name = "Ha Noi", CountryId = "VN", IsDeleted = false };
        var district = new District { Id = 11, Name = "Ba Dinh", ProvinceId = 1, Province = province, IsDeleted = false };

        var inactiveLocation = new Location
        {
            Id = 1,
            Name = "Inactive",
            Address = "A",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 11,
            District = district,
            Status = LocationStatus.Inactive,
            IsDeleted = false,
            CreatedAt = monthStart
        };

        var ctx = MockDbContextFactory.Create()
            .WithProvinces(province)
            .WithDistricts(district)
            .WithLocations(inactiveLocation)
            .Build();

        var handler = new GetAdminDashboardInsightsQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetAdminDashboardInsightsQuery(), default);

        result.IsError.Should().BeFalse();
        result.Value.AvgReviewsPerActiveLocation.Should().Be(0m);
        result.Value.LocationsWithoutReviews.Should().Be(0);
    }

    [Fact]
    public async Task Handle_RoundsAvgReviewsPerActiveLocation_ToTwoDecimals()
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var province = new Province { Id = 1, Name = "Ha Noi", CountryId = "VN", IsDeleted = false };
        var district = new District { Id = 11, Name = "Ba Dinh", ProvinceId = 1, Province = province, IsDeleted = false };

        var location1 = new Location
        {
            Id = 1,
            Name = "A",
            Address = "A",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 11,
            District = district,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = monthStart
        };

        var location2 = new Location
        {
            Id = 2,
            Name = "B",
            Address = "B",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 11,
            District = district,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = monthStart
        };

        var location3 = new Location
        {
            Id = 3,
            Name = "C",
            Address = "C",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 11,
            District = district,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = monthStart
        };

        var review1 = new LocationReview
        {
            Id = 1,
            LocationId = 1,
            UserId = 1,
            Rating = 5,
            Comment = "r1",
            Status = LocationReviewStatus.Visible,
            IsDeleted = false,
            CreatedAt = monthStart
        };

        var review2 = new LocationReview
        {
            Id = 2,
            LocationId = 2,
            UserId = 2,
            Rating = 4,
            Comment = "r2",
            Status = LocationReviewStatus.Visible,
            IsDeleted = false,
            CreatedAt = monthStart
        };

        var ctx = MockDbContextFactory.Create()
            .WithProvinces(province)
            .WithDistricts(district)
            .WithLocations(location1, location2, location3)
            .WithLocationReviews(review1, review2)
            .Build();

        var handler = new GetAdminDashboardInsightsQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetAdminDashboardInsightsQuery(), default);

        result.IsError.Should().BeFalse();
        result.Value.AvgReviewsPerActiveLocation.Should().Be(0.67m);
        result.Value.LocationsWithoutReviews.Should().Be(1);
    }
}
