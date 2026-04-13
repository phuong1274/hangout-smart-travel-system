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

        var culturalType = new LocationType { Id = 1, Name = "Cultural site", Description = "Places with heritage value" };
        var cultureTag = new Tag { Id = 100, Name = "Culture", Level = 1 };
        var templeAmenity = new Amenity { Id = 50, Name = "Parking", Description = "Motorbike parking" };

        var location = new Location
        {
            Id = 1,
            Name = "Temple",
            Description = "desc",
            Address = "street",
            Latitude = 21,
            Longitude = 105,
            TicketPrice = 100,
            MinimumAge = 12,
            DistrictId = baDinh.Id,
            District = baDinh,
            LocationTypeId = culturalType.Id,
            LocationType = culturalType,
            Telephone = "0123456789",
            Email = "temple@example.com",
            SourceUrl = "https://example.com/temple",
            PriceMinUsd = 20m,
            PriceMaxUsd = 35m,
            RecommendedDurationMinutes = 90,
            Status = LocationStatus.Active,
            IsDeleted = false,
            Score = 4.5m
        };
        location.LocationMedias.Add(new LocationMedia { Id = 10, LocationId = 1, Link = "img-1", IsDeleted = false });
        location.LocationMedias.Add(new LocationMedia { Id = 11, LocationId = 1, Link = "img-2", IsDeleted = false });
        location.LocationTags.Add(new LocationTag { LocationId = 1, TagId = cultureTag.Id, Tag = cultureTag });
        location.LocationAmenities.Add(new LocationAmenity { LocationId = 1, AmenityId = templeAmenity.Id, Amenity = templeAmenity });
        location.OpeningHours.Add(new LocationOpeningHour { Id = 70, LocationId = 1, DayOfWeek = DayOfWeek.Monday, OpenTime = new TimeSpan(8, 0, 0), CloseTime = new TimeSpan(17, 0, 0), Note = "Last entry at 16:30" });
        location.Seasons.Add(new LocationSeason { Id = 80, LocationId = 1, Description = "Spring festivals", Months = "1,2,3" });
        location.Closures.Add(new LocationClosure { Id = 90, LocationId = 1, StartDate = DateTime.UtcNow.Date.AddDays(-1), EndDate = DateTime.UtcNow.Date.AddDays(1), IsActive = true, IsDeleted = false, Reason = "Maintenance" });
        location.SocialLinks.Add(new LocationSocialLink { Id = 99, LocationId = 1, Platform = SocialPlatform.Facebook, Url = "https://facebook.com/temple" });

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
        result.Value.LocationType.Should().NotBeNull();
        result.Value.LocationType!.Name.Should().Be("Cultural site");
        result.Value.Tags.Should().ContainSingle();
        result.Value.Tags[0].Name.Should().Be("Culture");
        result.Value.Amenities.Should().ContainSingle();
        result.Value.Amenities[0].Name.Should().Be("Parking");
        result.Value.OpeningHours.Should().ContainSingle();
        result.Value.OpeningHours[0].DayOfWeek.Should().Be(DayOfWeek.Monday);
        result.Value.Seasons.Should().ContainSingle();
        result.Value.Seasons[0].Months.Should().Be("1,2,3");
        result.Value.PriceMinUsd.Should().Be(20m);
        result.Value.PriceMaxUsd.Should().Be(35m);
        result.Value.TicketPrice.Should().Be(100m);
        result.Value.RecommendedDurationMinutes.Should().Be(90);
        result.Value.MinimumAge.Should().Be(12);
        result.Value.Latitude.Should().Be(21);
        result.Value.Longitude.Should().Be(105);
        result.Value.Telephone.Should().Be("0123456789");
        result.Value.Email.Should().Be("temple@example.com");
        result.Value.SourceUrl.Should().Be("https://example.com/temple");
        result.Value.Status.Should().Be(LocationStatus.TemporarilyClosed.ToString());
        result.Value.SocialLinks.Should().ContainSingle();
        result.Value.SocialLinks[0].Platform.Should().Be(SocialPlatform.Facebook.ToString());
    }
}
