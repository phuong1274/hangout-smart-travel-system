using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Reviews.Commands;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Reviews;

public class DeleteModeratedReviewCommandTests
{
    [Fact]
    public async Task Handle_AdminDeletes_ReviewSoftDeletedAndReportsResolved()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        var report = ReviewFakes.PendingReport(99, 1, 200);
        var ctx = MockDbContextFactory.Create()
            .WithLocationReviews(review)
            .WithLocationReviewReports(report)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(1);

        var handler = new DeleteModeratedReviewCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new DeleteModeratedReviewCommand(1, "Offensive content"), default);

        result.IsError.Should().BeFalse();
        review.Status.Should().Be(LocationReviewStatus.Deleted);
        review.IsDeleted.Should().BeTrue();
        report.Status.Should().Be(LocationReviewReportStatus.Resolved);
    }
}
