using FluentAssertions;
using HSTS.Application.Locations.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Locations;

public class GetPublicLocationDetailQueryTests
{
    [Fact]
    public async Task Handle_WithExistingLocation_ReturnsDetailWithReviewSummary()
    {
        var hanoi = new Province { Id = 10, Name = "Ha Noi", CountryId = "VN" };
        var baDinh = new District { Id = 101, Name = "Ba Dinh", ProvinceId = hanoi.Id, Province = hanoi };

        var location = new Location
        {
            Id = 1,
            Name = "Temple",
            Description = "desc",
            Address = "street",
            Latitude = 21,
            Longitude = 105,
            TicketPrice = 100,
            MinimumAge = 0,
            DistrictId = baDinh.Id,
            District = baDinh,
            Status = LocationStatus.Active,
            IsDeleted = false,
            Score = 4.5m
        };
        location.LocationMedias.Add(new LocationMedia { Id = 10, LocationId = 1, Link = "img-1", IsDeleted = false });
        location.LocationMedias.Add(new LocationMedia { Id = 11, LocationId = 1, Link = "img-2", IsDeleted = false });

        var ctx = MockDbContextFactory.Create()
            .WithLocations(location)
            .WithLocationReviews(
                new LocationReview { Id = 1, LocationId = 1, UserId = 1, Rating = 5, Comment = "great", Status = LocationReviewStatus.Visible, IsDeleted = false },
                new LocationReview { Id = 2, LocationId = 1, UserId = 2, Rating = 4, Comment = "good", Status = LocationReviewStatus.Visible, IsDeleted = false },
                new LocationReview { Id = 3, LocationId = 1, UserId = 3, Rating = 2, Comment = "hidden", Status = LocationReviewStatus.Hidden, IsDeleted = false })
            .Build();

        var handler = new GetPublicLocationDetailQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetPublicLocationDetailQuery(1), default);

        result.IsError.Should().BeFalse();
        result.Value.Id.Should().Be(1);
        result.Value.Destination.Should().Be("Ha Noi");
        result.Value.District.Should().Be("Ba Dinh");
        result.Value.ReviewCount.Should().Be(2);
        result.Value.AverageRating.Should().Be(4.5m);
        result.Value.ImageUrls.Should().ContainInOrder("img-1", "img-2");
    }
}
