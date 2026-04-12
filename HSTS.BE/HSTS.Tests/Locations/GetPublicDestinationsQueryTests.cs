using FluentAssertions;
using HSTS.Application.Locations.Queries;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Locations;

public class GetPublicDestinationsQueryTests
{
    [Fact]
    public async Task Handle_WithPublishedLocations_ReturnsDistinctDestinations()
    {
        var hanoi = new Province { Id = 10, Name = "Ha Noi", CountryId = "VN" };
        var tayHo = new District { Id = 101, Name = "Tay Ho", ProvinceId = hanoi.Id, Province = hanoi };
        var baDinh = new District { Id = 102, Name = "Ba Dinh", ProvinceId = hanoi.Id, Province = hanoi };

        var westLake = new Location
        {
            Id = 1,
            Name = "West Lake",
            Address = "A",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = tayHo.Id,
            District = tayHo,
            Status = LocationStatus.Active,
            IsDeleted = false
        };

        var mausoleum = new Location
        {
            Id = 2,
            Name = "Mausoleum",
            Address = "B",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = baDinh.Id,
            District = baDinh,
            Status = LocationStatus.Active,
            IsDeleted = false
        };

        var hidden = new Location
        {
            Id = 3,
            Name = "Hidden",
            Address = "C",
            Latitude = 1,
            Longitude = 1,
            TicketPrice = 0,
            DistrictId = baDinh.Id,
            District = baDinh,
            Status = LocationStatus.Inactive,
            IsDeleted = false
        };

        var ctx = MockDbContextFactory.Create()
            .WithLocations(westLake, mausoleum, hidden)
            .Build();

        var handler = new GetPublicDestinationsQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetPublicDestinationsQuery(10), default);

        result.IsError.Should().BeFalse();
        result.Value.Should().ContainSingle();

        var destination = result.Value.Single();
        destination.Id.Should().Be(10);
        destination.Name.Should().Be("Ha Noi");
        destination.LocationCount.Should().Be(2);
    }
}
