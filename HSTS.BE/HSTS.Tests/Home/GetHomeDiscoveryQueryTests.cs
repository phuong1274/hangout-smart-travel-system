using FluentAssertions;
using HSTS.Application.Home.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Home;

public class GetHomeDiscoveryQueryTests
{
    [Fact]
    public async Task Handle_ReturnsFeaturedDestinationsAndPopularLocations()
    {
        var hanoi = new Province { Id = 10, Name = "Ha Noi", CountryId = "VN" };
        var danang = new Province { Id = 20, Name = "Da Nang", CountryId = "VN" };
        var baDinh = new District { Id = 101, Name = "Ba Dinh", ProvinceId = hanoi.Id, Province = hanoi };
        var haiChau = new District { Id = 201, Name = "Hai Chau", ProvinceId = danang.Id, Province = danang };

        var temple = new Location { Id = 1, Name = "Temple", Address = "A", Latitude = 1, Longitude = 1, TicketPrice = 0, DistrictId = baDinh.Id, District = baDinh, Status = LocationStatus.Active, IsDeleted = false, Score = 4.9m };
        temple.LocationMedias.Add(new LocationMedia { Id = 1, LocationId = 1, Link = "img-1", IsDeleted = false });

        var museum = new Location { Id = 2, Name = "Museum", Address = "B", Latitude = 1, Longitude = 1, TicketPrice = 0, DistrictId = baDinh.Id, District = baDinh, Status = LocationStatus.Active, IsDeleted = false, Score = 4.5m };
        var beach = new Location { Id = 3, Name = "Beach", Address = "C", Latitude = 1, Longitude = 1, TicketPrice = 0, DistrictId = haiChau.Id, District = haiChau, Status = LocationStatus.Active, IsDeleted = false, Score = 4.8m };

        var ctx = MockDbContextFactory.Create()
            .WithLocations(temple, museum, beach)
            .WithLocationReviews(
                new LocationReview { Id = 1, LocationId = 1, UserId = 1, Rating = 5, Comment = "great", Status = LocationReviewStatus.Visible, IsDeleted = false },
                new LocationReview { Id = 2, LocationId = 3, UserId = 2, Rating = 4, Comment = "good", Status = LocationReviewStatus.Visible, IsDeleted = false })
            .Build();

        var handler = new GetHomeDiscoveryQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetHomeDiscoveryQuery(10, 10), default);

        result.IsError.Should().BeFalse();
        result.Value.FeaturedDestinations.Should().HaveCount(2);
        result.Value.FeaturedDestinations.First().Id.Should().Be(10);
        result.Value.FeaturedDestinations.First().Name.Should().Be("Ha Noi");
        result.Value.PopularLocations.Should().NotBeEmpty();
        result.Value.PopularLocations.First().Name.Should().Be("Temple");
        result.Value.SocialProof.Should().NotBeNull();
        result.Value.SocialProof.Stats.Should().HaveCount(3);
        result.Value.SocialProof.Stats[0].Value.Should().Be(2);
        result.Value.SocialProof.Stats[1].Value.Should().Be(3);
        result.Value.SocialProof.Stats[2].Value.Should().Be(0);
        result.Value.SocialProof.Stats[0].Label.Should().Be("Destinations available");
        result.Value.SocialProof.Stats[1].Label.Should().Be("Locations to compare");
        result.Value.SocialProof.Stats[2].Label.Should().Be("Trips planned");
        result.Value.SocialProof.Title.Should().NotBeNullOrWhiteSpace();
        result.Value.SocialProof.Description.Should().NotBeNullOrWhiteSpace();
        result.Value.SocialProof.HasRealData.Should().BeTrue();
        result.Value.SocialProof.Stats.All(x => x.HasRealValue).Should().BeTrue();
        result.Value.SocialProof.Stats.All(x => !string.IsNullOrWhiteSpace(x.SupportCopy)).Should().BeTrue();
    }
}
