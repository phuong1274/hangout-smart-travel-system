using FluentAssertions;
using HSTS.Application.Reviews.Commands;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Reviews;

public class UnhideReviewCommandTests
{
    [Fact]
    public async Task Handle_HiddenReview_BecomesVisibleAndClearsHideMetadata()
    {
        var review = ReviewFakes.Hidden(1, 10, 100);
        review.HiddenByUserId = 1;
        var ctx = MockDbContextFactory.Create()
            .WithLocationReviews(review)
            .Build();

        var handler = new UnhideReviewCommandHandler(ctx.Object);
        var result = await handler.Handle(new UnhideReviewCommand(1), default);

        result.IsError.Should().BeFalse();
        review.Status.Should().Be(LocationReviewStatus.Visible);
        review.HiddenAt.Should().BeNull();
        review.HiddenByUserId.Should().BeNull();
    }
}
