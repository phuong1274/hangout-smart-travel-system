using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Reviews.Commands;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Reviews;

public class UpdateReviewCommandTests
{
    [Fact]
    public async Task Handle_OwnReview_UpdatesSuccessfully()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        var ctx = MockDbContextFactory.Create().WithLocationReviews(review).Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(100);

        var handler = new UpdateReviewCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new UpdateReviewCommand(1, 3, "Updated", true), default);

        result.IsError.Should().BeFalse();
        result.Value.Rating.Should().Be(3);
        result.Value.Comment.Should().Be("Updated");
        result.Value.IsAnonymous.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_OtherUserReview_ReturnsForbidden()
    {
        var review = ReviewFakes.Visible(1, 10, 100);
        var ctx = MockDbContextFactory.Create().WithLocationReviews(review).Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(999);

        var handler = new UpdateReviewCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new UpdateReviewCommand(1, 3, "Hack", false), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Review.Forbidden");
    }
}
