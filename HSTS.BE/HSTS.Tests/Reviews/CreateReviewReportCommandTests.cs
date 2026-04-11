using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Reviews.Commands;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Reviews;

public class CreateReviewReportCommandTests
{
    [Fact]
    public async Task Handle_FirstReport_StoresPending()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        var ctx = MockDbContextFactory.Create().WithLocationReviews(review).Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(200);

        var handler = new CreateReviewReportCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new CreateReviewReportCommand(1, LocationReviewReportReason.Spam, "Spam"), default);

        result.IsError.Should().BeFalse();
        review.ReportCount.Should().Be(1);
        review.Status.Should().Be(LocationReviewStatus.Visible);
    }

    [Fact]
    public async Task Handle_SelfReport_ReturnsForbidden()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        var ctx = MockDbContextFactory.Create().WithLocationReviews(review).Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(100);

        var handler = new CreateReviewReportCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new CreateReviewReportCommand(1, LocationReviewReportReason.Spam, null), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("ReviewReport.SelfReport");
    }

    [Fact]
    public async Task Handle_DuplicateReport_ReturnsConflict()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        review.ReportCount = 1;
        var existing = ReviewFakes.PendingReport(id: 99, reviewId: 1, reporterId: 200);

        var ctx = MockDbContextFactory.Create()
            .WithLocationReviews(review)
            .WithLocationReviewReports(existing)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(200);

        var handler = new CreateReviewReportCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new CreateReviewReportCommand(1, LocationReviewReportReason.Spam, null), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("ReviewReport.AlreadyReported");
    }

    [Fact]
    public async Task Handle_ThresholdReached_AutoHidesReview()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        review.ReportCount = 4;

        var ctx = MockDbContextFactory.Create().WithLocationReviews(review).Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(200);

        var handler = new CreateReviewReportCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new CreateReviewReportCommand(1, LocationReviewReportReason.Spam, null), default);

        result.IsError.Should().BeFalse();
        review.ReportCount.Should().Be(5);
        review.Status.Should().Be(LocationReviewStatus.Hidden);
        review.HiddenAt.Should().NotBeNull();
    }
}
