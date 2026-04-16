using FluentAssertions;
using HSTS.Application.Dashboard.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Dashboard;

public class GetAdminDashboardQueuesQueryTests
{
    [Fact]
    public async Task Handle_ReturnsPendingSubmissionsAndReportedReviewsQueues()
    {
        var location = new Location
        {
            Id = 1,
            Name = "Hoan Kiem Lake",
            Address = "Ha Noi",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 1,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        var account = new Account
        {
            Id = 1,
            Email = "author@example.com",
            Status = AccountStatus.Active,
            IsDeleted = false
        };

        var user = new User
        {
            Id = 1,
            AccountId = 1,
            Account = account,
            FullName = "Author",
            IsDeleted = false
        };

        var newerPendingSubmission = new LocationSubmission
        {
            Id = 10,
            UserId = 1,
            Name = "Newer Submission",
            Address = "A",
            Latitude = 1,
            Longitude = 1,
            SubmissionType = SubmissionType.NewLocation,
            Status = SubmissionStatus.Pending,
            IsDeleted = false,
            CreatedAt = new DateTime(2026, 4, 10, 10, 0, 0, DateTimeKind.Utc)
        };

        var olderPendingSubmission = new LocationSubmission
        {
            Id = 9,
            UserId = 1,
            Name = "Older Submission",
            Address = "B",
            Latitude = 1,
            Longitude = 1,
            SubmissionType = SubmissionType.EditExisting,
            Status = SubmissionStatus.Pending,
            IsDeleted = false,
            CreatedAt = new DateTime(2026, 4, 9, 10, 0, 0, DateTimeKind.Utc)
        };

        var approvedSubmission = new LocationSubmission
        {
            Id = 8,
            UserId = 1,
            Name = "Approved Submission",
            Address = "C",
            Latitude = 1,
            Longitude = 1,
            SubmissionType = SubmissionType.NewLocation,
            Status = SubmissionStatus.Approved,
            IsDeleted = false,
            CreatedAt = new DateTime(2026, 4, 8, 10, 0, 0, DateTimeKind.Utc)
        };

        var reportedReview = new LocationReview
        {
            Id = 100,
            LocationId = 1,
            Location = location,
            UserId = 1,
            User = user,
            Rating = 5,
            Comment = "Great",
            ReportCount = 3,
            Status = LocationReviewStatus.Visible,
            IsDeleted = false,
            UpdatedAt = new DateTime(2026, 4, 10, 12, 0, 0, DateTimeKind.Utc)
        };

        var cleanReview = new LocationReview
        {
            Id = 101,
            LocationId = 1,
            Location = location,
            UserId = 1,
            User = user,
            Rating = 4,
            Comment = "Nice",
            ReportCount = 0,
            Status = LocationReviewStatus.Visible,
            IsDeleted = false,
            UpdatedAt = new DateTime(2026, 4, 10, 11, 0, 0, DateTimeKind.Utc)
        };

        var hiddenUnreportedReview = new LocationReview
        {
            Id = 102,
            LocationId = 1,
            Location = location,
            UserId = 1,
            User = user,
            Rating = 2,
            Comment = "Hidden without reports",
            ReportCount = 0,
            Status = LocationReviewStatus.Hidden,
            IsDeleted = false,
            UpdatedAt = new DateTime(2026, 4, 10, 13, 0, 0, DateTimeKind.Utc)
        };

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithLocations(location)
            .WithLocationSubmissions(newerPendingSubmission, olderPendingSubmission, approvedSubmission)
            .WithLocationReviews(reportedReview, cleanReview, hiddenUnreportedReview)
            .Build();

        var handler = new GetAdminDashboardQueuesQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetAdminDashboardQueuesQuery(SubmissionLimit: 5, ReviewLimit: 5), default);

        result.IsError.Should().BeFalse();
        result.Value.PendingSubmissions.Should().HaveCount(2);
        result.Value.PendingSubmissions[0].Id.Should().Be(10);
        result.Value.PendingSubmissions[1].Id.Should().Be(9);

        result.Value.PendingReviewReports.Should().HaveCount(2);
        result.Value.PendingReviewReports.Select(x => x.ReviewId).Should().Contain(new[] { 100, 102 });
        result.Value.PendingReviewReports[0].LocationName.Should().Be("Hoan Kiem Lake");
        result.Value.PendingReviewReports[0].AuthorEmail.Should().Be("author@example.com");
    }

    [Fact]
    public async Task Handle_Throws_WhenQueuedReviewHasNullUpdatedAt()
    {
        var location = new Location
        {
            Id = 1,
            Name = "Hoan Kiem Lake",
            Address = "Ha Noi",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = 1,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        var account = new Account
        {
            Id = 1,
            Email = "author@example.com",
            Status = AccountStatus.Active,
            IsDeleted = false
        };

        var user = new User
        {
            Id = 1,
            AccountId = 1,
            Account = account,
            FullName = "Author",
            IsDeleted = false
        };

        var queuedReviewWithNullUpdatedAt = new LocationReview
        {
            Id = 200,
            LocationId = 1,
            Location = location,
            UserId = 1,
            User = user,
            Rating = 3,
            Comment = "Queued review without updated timestamp",
            ReportCount = 1,
            Status = LocationReviewStatus.Visible,
            IsDeleted = false,
            UpdatedAt = null
        };

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithLocations(location)
            .WithLocationReviews(queuedReviewWithNullUpdatedAt)
            .Build();

        var handler = new GetAdminDashboardQueuesQueryHandler(ctx.Object);

        var act = async () => await handler.Handle(new GetAdminDashboardQueuesQuery(ReviewLimit: 5), default);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
