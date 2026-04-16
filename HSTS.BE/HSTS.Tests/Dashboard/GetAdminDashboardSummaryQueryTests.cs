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

        var trip1 = new Trip { Id = 1, TripName = "Trip 1", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), GroupSize = 2, Currency = "VND", Status = TripStatus.Planned, IsDeleted = false };
        var trip2 = new Trip { Id = 2, TripName = "Trip 2", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(2), GroupSize = 2, Currency = "VND", Status = TripStatus.Completed, IsDeleted = false };

        var ctx = MockDbContextFactory.Create()
            .WithUsers(
                new User { Id = 1, AccountId = 1, FullName = "User 1", IsDeleted = false },
                new User { Id = 2, AccountId = 2, FullName = "User 2", IsDeleted = false },
                new User { Id = 3, AccountId = 3, FullName = "Deleted", IsDeleted = true })
            .WithAccounts(
                new Account { Id = 1, Email = "u1@example.com", Status = AccountStatus.Active, IsDeleted = false },
                new Account { Id = 2, Email = "u2@example.com", Status = AccountStatus.PendingVerification, IsDeleted = false },
                new Account { Id = 3, Email = "u3@example.com", Status = AccountStatus.Active, IsDeleted = true })
            .WithProvinces(province1, province2)
            .WithDistricts(district1, district2)
            .WithLocations(location1, location2)
            .WithLocationReviews(
                new LocationReview { Id = 1, LocationId = 101, UserId = 1, Rating = 5, Comment = "great", Status = LocationReviewStatus.Visible, IsDeleted = false },
                new LocationReview { Id = 2, LocationId = 102, UserId = 2, Rating = 4, Comment = "nice", Status = LocationReviewStatus.Hidden, IsDeleted = false },
                new LocationReview { Id = 3, LocationId = 102, UserId = 2, Rating = 3, Comment = "old", Status = LocationReviewStatus.Hidden, IsDeleted = true })
            .WithLocationSubmissions(
                new LocationSubmission { Id = 1, UserId = 1, Name = "Pending", Address = "A", Latitude = 1, Longitude = 1, Status = SubmissionStatus.Pending, IsDeleted = false },
                new LocationSubmission { Id = 2, UserId = 1, Name = "Approved", Address = "B", Latitude = 1, Longitude = 1, Status = SubmissionStatus.Approved, IsDeleted = false },
                new LocationSubmission { Id = 3, UserId = 1, Name = "Deleted Pending", Address = "C", Latitude = 1, Longitude = 1, Status = SubmissionStatus.Pending, IsDeleted = true })
            .WithLocationReviewReports(
                new LocationReviewReport { Id = 1, LocationReviewId = 1, ReporterUserId = 2, Reason = LocationReviewReportReason.Spam, Status = LocationReviewReportStatus.Pending, IsDeleted = false },
                new LocationReviewReport { Id = 2, LocationReviewId = 2, ReporterUserId = 1, Reason = LocationReviewReportReason.Other, Status = LocationReviewReportStatus.Ignored, IsDeleted = false },
                new LocationReviewReport { Id = 3, LocationReviewId = 2, ReporterUserId = 1, Reason = LocationReviewReportReason.Other, Status = LocationReviewReportStatus.Pending, IsDeleted = true })
            .WithTrips(trip1, trip2)
            .Build();

        var handler = new GetAdminDashboardSummaryQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetAdminDashboardSummaryQuery(), default);

        result.IsError.Should().BeFalse();
        result.Value.TotalUsers.Should().Be(2);
        result.Value.ActiveAccounts.Should().Be(1);
        result.Value.TotalTrips.Should().Be(2);
        result.Value.CompletedTrips.Should().Be(1);
        result.Value.ActiveLocations.Should().Be(2);
        result.Value.CoveredDestinations.Should().Be(2);
        result.Value.VisibleReviews.Should().Be(1);
        result.Value.PendingLocationSubmissions.Should().Be(1);
        result.Value.PendingReviewReports.Should().Be(1);
        result.Value.HiddenReviews.Should().Be(1);
    }
}
