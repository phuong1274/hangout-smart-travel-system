using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Reviews.Commands;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Reviews;

public class DeleteReviewCommandTests
{
    [Fact]
    public async Task Handle_OwnReview_SoftDeletes()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        var ctx = MockDbContextFactory.Create().WithLocationReviews(review).Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(100);

        var handler = new DeleteReviewCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new DeleteReviewCommand(1), default);

        result.IsError.Should().BeFalse();
        review.Status.Should().Be(LocationReviewStatus.Deleted);
        review.IsDeleted.Should().BeTrue();
    }
}
