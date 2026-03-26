using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Itineraries.Commands;
using HSTS.Application.Itineraries.Common;
using HSTS.Domain.Entities;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using MockQueryable.Moq;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Tests.Itineraries;

public class CalculateItineraryCommandTests
{
    private readonly Mock<IRepository<Location>> _locationRepository = new();
    private readonly Mock<IDistanceService> _distanceService = new();
    private readonly Mock<IWeatherService> _weatherService = new();

    public CalculateItineraryCommandTests()
    {
        _distanceService.Setup(x => x.GetRouteInfoAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<string>()))
            .ReturnsAsync(new RouteInfo(10, 15));
        _weatherService.Setup(x => x.GetWeatherFactorAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<DateTime>()))
            .ReturnsAsync(1.0);
    }

    [Fact]
    public async Task Handle_CalculatesItinerary_WithDynamicBudgetWeights()
    {
        // Arrange
        var startDate = new DateTime(2026, 3, 26); // Thursday
        var endDate = startDate.AddDays(3); // Sunday (4 days total)
        var command = new CalculateItineraryCommand
        {
            TotalBudget = 1000,
            StartDate = startDate,
            EndDate = endDate,
            Preferences = new List<string> { "Nature" },
            StartLat = 0,
            StartLon = 0
        };

        // ActivitiesAllocation = 300
        // totalDays = 4. dynamicDivisor = 4 * 1.5 = 6.
        // baseStepBudget = 300 / 6 = 50.
        
        // Weights:
        // Day 1 (Thu): 1.3 -> 65
        // Day 2 (Fri): 1.1 -> 55
        // Day 3 (Sat): 1.0 * 1.15 = 1.15 -> 57.5
        // Day 4 (Sun): 1.2 * 1.15 = 1.38 -> 69

        var district = new District { Id = 1, ProvinceId = 1, Province = new Province { Id = 1 } };
        var locations = new List<Location>
        {
            new Location { Id = 1, Name = "High Budget Loc", AverageBudget = 68, Latitude = 1, Longitude = 1, Tags = new List<string> { "Nature" }, District = district },
            new Location { Id = 2, Name = "Medium Budget Loc", AverageBudget = 55, Latitude = 2, Longitude = 2, Tags = new List<string> { "Nature" }, District = district },
            new Location { Id = 3, Name = "Low Budget Loc", AverageBudget = 40, Latitude = 3, Longitude = 3, Tags = new List<string> { "Nature" }, District = district }
        };

        _locationRepository.Setup(x => x.Query()).Returns(locations.AsQueryable().BuildMockDbSet().Object);

        var handler = new CalculateItineraryCommandHandler(_locationRepository.Object, _distanceService.Object, _weatherService.Object);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Days.Should().HaveCount(4);
        
        // Verifying BudgetBreakdown
        result.BudgetBreakdown.ActivitiesAllocation.Should().Be(300);
        
        // Verify Day 1 picks a location (just to ensure the logic runs)
        result.Days[0].Items.Should().NotBeEmpty();
    }
}
