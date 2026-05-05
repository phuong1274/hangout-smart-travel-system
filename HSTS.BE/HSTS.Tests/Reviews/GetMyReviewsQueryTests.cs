using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Reviews.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Reviews;

public class GetMyReviewsQueryTests
{
    [Fact]
    public async Task Handle_MixedUsers_ReturnsOnlyCurrentUsersNonDeletedReviews()
    {
        var ownVisible = Review(id: 1, userId: 100, location: Location(10, "Museum", "Old Street"));
        var ownHidden = Review(id: 2, userId: 100, location: Location(11, "Temple", "Lake Road"), status: LocationReviewStatus.Hidden);
        var others = Review(id: 3, userId: 200, location: Location(12, "Market", "River Road"));
        var deleted = Review(id: 4, userId: 100, location: Location(13, "Deleted", "Hidden Road"), status: LocationReviewStatus.Deleted);

        var handler = HandlerFor(userId: 100, ownVisible, ownHidden, others, deleted);

        var result = await handler.Handle(new GetMyReviewsQuery(), default);

        result.IsError.Should().BeFalse();
        result.Value.TotalCount.Should().Be(2);
        result.Value.Items.Select(x => x.ReviewId).Should().BeEquivalentTo(new[] { 1, 2 });
        result.Value.Items.Should().Contain(x => x.LocationName == "Museum" && x.LocationTypeName == "Sight" && x.DistrictName == "Central");
    }

    [Fact]
    public async Task Handle_SearchRatingStatusAndPagination_AppliesServerSide()
    {
        var first = Review(id: 1, userId: 100, location: Location(10, "Coffee Museum", "First Road"), rating: 5, comment: "Loved coffee");
        var second = Review(id: 2, userId: 100, location: Location(11, "Coffee Park", "Second Road"), rating: 5, comment: "Coffee walk");
        var wrongRating = Review(id: 3, userId: 100, location: Location(12, "Coffee Hall", "Third Road"), rating: 4, comment: "Coffee");
        var hidden = Review(id: 4, userId: 100, location: Location(13, "Coffee Cave", "Fourth Road"), rating: 5, comment: "Coffee", status: LocationReviewStatus.Hidden);

        var handler = HandlerFor(userId: 100, first, second, wrongRating, hidden);

        var result = await handler.Handle(new GetMyReviewsQuery(
            PageIndex: 2,
            PageSize: 1,
            SearchTerm: "Coffee",
            Rating: 5,
            Status: LocationReviewStatus.Visible,
            SortBy: "locationName",
            SortDirection: "asc"), default);

        result.IsError.Should().BeFalse();
        result.Value.TotalCount.Should().Be(2);
        result.Value.Items.Should().ContainSingle();
        result.Value.Items.Single().LocationName.Should().Be("Coffee Park");
    }

    private static GetMyReviewsQueryHandler HandlerFor(int userId, params LocationReview[] reviews)
    {
        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(userId);

        var ctx = MockDbContextFactory.Create()
            .WithLocationReviews(reviews)
            .Build();

        return new GetMyReviewsQueryHandler(ctx.Object, current.Object);
    }

    private static LocationReview Review(
        int id,
        int userId,
        Location location,
        int rating = 5,
        string comment = "Great place",
        LocationReviewStatus status = LocationReviewStatus.Visible) =>
        new()
        {
            Id = id,
            UserId = userId,
            LocationId = location.Id,
            Location = location,
            Rating = rating,
            Comment = comment,
            Status = status,
            ReportCount = status == LocationReviewStatus.Hidden ? 2 : 0,
            CreatedAt = new DateTime(2026, 5, id, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 5, id, 1, 0, 0, DateTimeKind.Utc)
        };

    private static Location Location(int id, string name, string address) =>
        new()
        {
            Id = id,
            Name = name,
            Address = address,
            DistrictId = 1,
            District = new District { Id = 1, Name = "Central" },
            LocationTypeId = 1,
            LocationType = new LocationType { Id = 1, Name = "Sight" },
            Latitude = 10,
            Longitude = 10,
            TicketPrice = 0
        };
}
