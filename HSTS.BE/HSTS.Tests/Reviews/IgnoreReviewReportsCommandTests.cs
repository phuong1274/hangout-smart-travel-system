using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Reviews.Commands;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Reviews;

public class IgnoreReviewReportsCommandTests
{
    [Fact]
    public async Task Handle_PendingReports_AreMarkedIgnored()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        var report = ReviewFakes.PendingReport(99, 1, 200);
        var ctx = MockDbContextFactory.Create()
            .WithLocationReviews(review)
            .WithLocationReviewReports(report)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(1);

        var handler = new IgnoreReviewReportsCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new IgnoreReviewReportsCommand(1, "False alarm"), default);

        result.IsError.Should().BeFalse();
        report.Status.Should().Be(LocationReviewReportStatus.Ignored);
        report.ProcessedByUserId.Should().Be(1);
        review.Status.Should().Be(LocationReviewStatus.Visible);
    }
}
