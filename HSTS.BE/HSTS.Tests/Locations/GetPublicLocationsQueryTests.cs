using FluentAssertions;
using HSTS.Application.Locations.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Locations;

public class GetPublicLocationsQueryTests
{
    [Fact]
    public async Task Handle_WithFilters_ReturnsMatchingLocationsOnly()
    {
        var hanoi = new Province { Id = 10, Name = "Ha Noi", CountryId = "VN" };
        var danang = new Province { Id = 20, Name = "Da Nang", CountryId = "VN" };
        var baDinh = new District { Id = 101, Name = "Ba Dinh", ProvinceId = hanoi.Id, Province = hanoi };
        var haiChau = new District { Id = 201, Name = "Hai Chau", ProvinceId = danang.Id, Province = danang };

        var culturalType = new LocationType { Id = 1, Name = "Cultural site" };

        var temple = new Location
        {
            Id = 1,
            Name = "Temple",
            Description = "historic",
            Address = "1 Temple Street",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 40m,
            DistrictId = baDinh.Id,
            District = baDinh,
            LocationTypeId = 1,
            LocationType = culturalType,
            Status = LocationStatus.Active,
            IsDeleted = false,
            Score = 4.8m,
            PriceMinUsd = 120m,
            PriceMaxUsd = 180m,
            RecommendedDurationMinutes = 90
        };
        temple.LocationMedias.Add(new LocationMedia { Id = 1, LocationId = 1, Link = "img-1", IsDeleted = false });
        temple.LocationTags.Add(new LocationTag { LocationId = 1, TagId = 100, Tag = new Tag { Id = 100, Name = "Culture", Level = 1 } });
        temple.Closures.Add(new LocationClosure
        {
            Id = 10,
            LocationId = 1,
            StartDate = DateTime.UtcNow.Date.AddDays(-1),
            EndDate = DateTime.UtcNow.Date.AddDays(1),
            IsActive = true,
            IsDeleted = false,
            Reason = "Maintenance"
        });

        var museumType = new LocationType { Id = 2, Name = "Museum" };

        var museum = new Location
        {
            Id = 2,
            Name = "Museum",
            Description = "culture",
            Address = "2 Museum Street",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 30m,
            DistrictId = baDinh.Id,
            District = baDinh,
            LocationTypeId = 2,
            LocationType = museumType,
            Status = LocationStatus.Active,
            IsDeleted = false,
            Score = 4.2m,
            PriceMinUsd = 250m,
            PriceMaxUsd = 350m,
            RecommendedDurationMinutes = 240
        };
        museum.LocationTags.Add(new LocationTag { LocationId = 2, TagId = 101, Tag = new Tag { Id = 101, Name = "Indoor", Level = 1 } });

        var beach = new Location
        {
            Id = 3,
            Name = "Beach",
            Description = "sea",
            Address = "3 Beach Road",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = haiChau.Id,
            District = haiChau,
            LocationTypeId = 1,
            LocationType = culturalType,
            Status = LocationStatus.Active,
            IsDeleted = false,
            Score = 4.9m,
            PriceMinUsd = 400m,
            PriceMaxUsd = 600m,
            RecommendedDurationMinutes = 300
        };

        var ctx = MockDbContextFactory.Create()
            .WithLocations(temple, museum, beach)
            .WithLocationReviews(
                new LocationReview { Id = 1, LocationId = 1, UserId = 1, Rating = 5, Comment = "great", Status = LocationReviewStatus.Visible, IsDeleted = false },
                new LocationReview { Id = 2, LocationId = 1, UserId = 2, Rating = 4, Comment = "ok", Status = LocationReviewStatus.Visible, IsDeleted = false },
                new LocationReview { Id = 3, LocationId = 2, UserId = 3, Rating = 4, Comment = "hidden", Status = LocationReviewStatus.Hidden, IsDeleted = false })
            .Build();

        var handler = new GetPublicLocationsQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetPublicLocationsQuery(hanoi.Id, baDinh.Id, 1, new List<int> { 100 }, "Tem", 4.5m, 100m, 200m, 120, 1, 10), default);

        result.IsError.Should().BeFalse();
        result.Value.TotalCount.Should().Be(1);

        var card = result.Value.Items.Single();
        card.Id.Should().Be(1);
        card.Destination.Should().Be("Ha Noi");
        card.District.Should().Be("Ba Dinh");
        card.Address.Should().Be("1 Temple Street");
        card.Description.Should().Be("historic");
        card.AverageRating.Should().Be(4.5m);
        card.ReviewCount.Should().Be(2);
        card.ImageUrl.Should().Be("img-1");
        card.LocationType.Should().NotBeNull();
        card.LocationType!.Id.Should().Be(1);
        card.LocationType.Name.Should().Be("Cultural site");
        card.Tags.Should().ContainSingle();
        card.Tags[0].Name.Should().Be("Culture");
        card.PriceMinUsd.Should().Be(120m);
        card.PriceMaxUsd.Should().Be(180m);
        card.TicketPrice.Should().Be(40m);
        card.RecommendedDurationMinutes.Should().Be(90);
        card.Status.Should().Be(LocationStatus.TemporarilyClosed.ToString());
        result.Value.PageIndex.Should().Be(1);
        result.Value.PageSize.Should().Be(10);
    }
}
