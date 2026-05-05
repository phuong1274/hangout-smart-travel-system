using ErrorOr;
using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Locations.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using MockQueryable.Moq;
using Moq;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Tests.Locations;

public class GetLocationQueryTests
{
    [Fact]
    public async Task Handle_ExistingLocation_ReturnsLocationDtoWithRelatedData()
    {
        var referenceDate = new DateTime(2026, 4, 26, 0, 0, 0, DateTimeKind.Utc);
        var hanoi = new Province { Id = 10, Name = "Ha Noi", CountryId = "VN" };
        var baDinh = new District { Id = 101, Name = "Ba Dinh", ProvinceId = hanoi.Id, Province = hanoi };
        var culturalType = new LocationType { Id = 1, Name = "Cultural site", Description = "Places with heritage value" };
        var cultureTag = new Tag { Id = 100, Name = "Culture", Level = 1 };
        var parking = new Amenity { Id = 50, Name = "Parking", Description = "Motorbike parking" };

        var location = new Location
        {
            Id = 1,
            Name = "Temple",
            Description = "Historic temple",
            Latitude = 21.0278,
            Longitude = 105.8342,
            TicketPrice = 100m,
            MinimumAge = 12,
            Address = "1 Temple Street",
            Telephone = "0123456789",
            Email = "temple@example.com",
            DistrictId = baDinh.Id,
            District = baDinh,
            LocationTypeId = culturalType.Id,
            LocationType = culturalType,
            SourceUrl = "https://example.com/temple",
            PriceMinUsd = 20m,
            PriceMaxUsd = 35m,
            RecommendedDurationMinutes = 90,
            Score = 4.5m,
            Status = LocationStatus.Active,
            IsDeleted = false,
            CreatedAt = referenceDate.AddDays(-10),
            UpdatedAt = referenceDate.AddDays(-1)
        };

        location.LocationTags.Add(new LocationTag { LocationId = location.Id, TagId = cultureTag.Id, Tag = cultureTag });
        location.LocationMedias.Add(new LocationMedia { Id = 10, LocationId = location.Id, Link = "img-1", IsDeleted = false });
        location.LocationAmenities.Add(new LocationAmenity { LocationId = location.Id, AmenityId = parking.Id, Amenity = parking });
        location.SocialLinks.Add(new LocationSocialLink { Id = 20, LocationId = location.Id, Platform = SocialPlatform.Facebook, Url = "https://facebook.com/temple" });
        location.OpeningHours.Add(new LocationOpeningHour { Id = 30, LocationId = location.Id, DayOfWeek = DayOfWeek.Monday, OpenTime = new TimeSpan(8, 0, 0), CloseTime = new TimeSpan(17, 0, 0), Note = "Last entry at 16:30" });
        location.Seasons.Add(new LocationSeason { Id = 40, LocationId = location.Id, Description = "Spring festivals", Months = "1,2,3" });
        location.Closures.Add(new LocationClosure
        {
            Id = 50,
            LocationId = location.Id,
            StartDate = referenceDate.AddDays(-1),
            EndDate = referenceDate.AddDays(1),
            IsActive = true,
            IsDeleted = false,
            Reason = "Maintenance"
        });

        var handler = new GetLocationQueryHandler(BuildRepository(location).Object);

        var result = await handler.Handle(new GetLocationQuery(location.Id, referenceDate), default);

        result.IsError.Should().BeFalse();
        result.Value.Id.Should().Be(location.Id);
        result.Value.Name.Should().Be("Temple");
        result.Value.Description.Should().Be("Historic temple");
        result.Value.Latitude.Should().Be(21.0278);
        result.Value.Longitude.Should().Be(105.8342);
        result.Value.TicketPrice.Should().Be(100m);
        result.Value.MinimumAge.Should().Be(12);
        result.Value.Address.Should().Be("1 Temple Street");
        result.Value.LocationTypeId.Should().Be(culturalType.Id);
        result.Value.LocationTypeName.Should().Be("Cultural site");
        result.Value.DistrictId.Should().Be(baDinh.Id);
        result.Value.DistrictName.Should().Be("Ba Dinh");
        result.Value.TagIds.Should().ContainSingle().Which.Should().Be(cultureTag.Id);
        result.Value.TagNames.Should().ContainSingle().Which.Should().Be("Culture");
        result.Value.Tags.Should().ContainSingle(tag => tag.Id == cultureTag.Id && tag.Name == "Culture");
        result.Value.MediaLinks.Should().ContainSingle().Which.Should().Be("img-1");
        result.Value.AmenityIds.Should().ContainSingle().Which.Should().Be(parking.Id);
        result.Value.AmenityNames.Should().ContainSingle().Which.Should().Be("Parking");
        result.Value.Amenities.Should().ContainSingle(amenity => amenity.Id == parking.Id && amenity.Name == "Parking");
        result.Value.SocialLinks.Should().ContainSingle(link => link.Id == 20 && link.Platform == SocialPlatform.Facebook && link.Url == "https://facebook.com/temple");
        result.Value.OpeningHours.Should().ContainSingle(hour => hour.Id == 30 && hour.DayOfWeek == 1 && hour.DayName == "Monday");
        result.Value.Seasons.Should().ContainSingle(season => season.Id == 40 && season.Description == "Spring festivals" && season.Months == "1,2,3");
        result.Value.Telephone.Should().Be("0123456789");
        result.Value.Email.Should().Be("temple@example.com");
        result.Value.PriceMinUsd.Should().Be(20m);
        result.Value.PriceMaxUsd.Should().Be(35m);
        result.Value.RecommendedDurationMinutes.Should().Be(90);
        result.Value.Score.Should().Be(4.5m);
        result.Value.Status.Should().Be(LocationStatus.Active);
        result.Value.EffectiveStatus.Should().Be(LocationStatus.TemporarilyClosed);
        result.Value.CreatedAt.Should().Be(referenceDate.AddDays(-10));
        result.Value.UpdatedAt.Should().Be(referenceDate.AddDays(-1));
    }

    [Fact]
    public async Task Handle_MissingLocation_ReturnsNotFoundError()
    {
        var handler = new GetLocationQueryHandler(BuildRepository().Object);

        var result = await handler.Handle(new GetLocationQuery(999), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Type.Should().Be(ErrorType.NotFound);
        result.FirstError.Code.Should().Be("Location.NotFound");
        result.FirstError.Description.Should().Be("Location with ID 999 not found.");
    }

    [Fact]
    public async Task Handle_SoftDeletedLocation_ReturnsNotFoundError()
    {
        var deletedLocation = new Location
        {
            Id = 2,
            Name = "Deleted Temple",
            Address = "2 Temple Street",
            Latitude = 21,
            Longitude = 105,
            TicketPrice = 10m,
            DistrictId = 1,
            Status = LocationStatus.Active,
            IsDeleted = true
        };
        var handler = new GetLocationQueryHandler(BuildRepository(deletedLocation).Object);

        var result = await handler.Handle(new GetLocationQuery(deletedLocation.Id), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Type.Should().Be(ErrorType.NotFound);
        result.FirstError.Code.Should().Be("Location.NotFound");
        result.FirstError.Description.Should().Be("Location with ID 2 not found.");
    }

    private static Mock<IRepository<Location>> BuildRepository(params Location[] locations)
    {
        var repository = new Mock<IRepository<Location>>();
        repository.Setup(x => x.Query()).Returns(locations.AsQueryable().BuildMockDbSet().Object);
        return repository;
    }
}
