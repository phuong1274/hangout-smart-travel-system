using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Reviews.Commands;
using HSTS.Domain.Entities;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Reviews;

public class CreateReviewCommandTests
{
    [Fact]
    public async Task Handle_NewReview_PersistsAndReturnsDto()
    {
        var location = new Location { Id = 10, Name = "L", Address = "A", DistrictId = 1, Latitude = 10, Longitude = 10, TicketPrice = 0 };
        var ctx = MockDbContextFactory.Create()
            .WithLocations(location)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(100);

        var handler = new CreateReviewCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new CreateReviewCommand(LocationId: 10, Rating: 5, Comment: "Loved it", IsAnonymous: false), default);

        result.IsError.Should().BeFalse();
        result.Value.LocationId.Should().Be(10);
        result.Value.Rating.Should().Be(5);
    }

    [Fact]
    public async Task Handle_DuplicateReview_ReturnsConflict()
    {
        var existing = ReviewFakes.Visible(id: 1, locationId: 10, userId: 100);
        var location = new Location { Id = 10, Name = "L", Address = "A", DistrictId = 1, Latitude = 10, Longitude = 10, TicketPrice = 0 };
        var ctx = MockDbContextFactory.Create()
            .WithLocations(location)
            .WithLocationReviews(existing)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(100);

        var handler = new CreateReviewCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new CreateReviewCommand(10, 4, "Again", false), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Review.AlreadyExists");
    }
}
