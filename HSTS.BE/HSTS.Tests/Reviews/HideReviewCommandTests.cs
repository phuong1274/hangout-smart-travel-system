using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Reviews.Commands;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Reviews;

public class HideReviewCommandTests
{
    [Fact]
    public async Task Handle_VisibleReview_BecomesHiddenAndReportsResolved()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        var report = ReviewFakes.PendingReport(99, 1, 200);
        var ctx = MockDbContextFactory.Create()
            .WithLocationReviews(review)
            .WithLocationReviewReports(report)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(1);

        var handler = new HideReviewCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new HideReviewCommand(1), default);

        result.IsError.Should().BeFalse();
        review.Status.Should().Be(LocationReviewStatus.Hidden);
        review.HiddenAt.Should().NotBeNull();
        report.Status.Should().Be(LocationReviewReportStatus.Resolved);
    }
}
