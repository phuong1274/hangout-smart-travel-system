using FluentAssertions;
using HSTS.Application.Reviews.Queries;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Reviews;

public class GetLocationReviewsQueryTests
{
    [Fact]
    public async Task Handle_OnlyVisibleReviews_AreReturned()
    {
        var visible = ReviewFakes.Visible(id: 1, locationId: 10, userId: 100);
        var hidden = ReviewFakes.Hidden(id: 2, locationId: 10, userId: 101);

        var ctx = MockDbContextFactory.Create()
            .WithLocationReviews(visible, hidden)
            .Build();

        var handler = new GetLocationReviewsQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetLocationReviewsQuery(LocationId: 10, PageIndex: 1, PageSize: 10), default);

        result.IsError.Should().BeFalse();
        result.Value.TotalCount.Should().Be(1);
        result.Value.Items.Should().ContainSingle(r => r.Id == 1 && r.Status == LocationReviewStatus.Visible);
    }
}
