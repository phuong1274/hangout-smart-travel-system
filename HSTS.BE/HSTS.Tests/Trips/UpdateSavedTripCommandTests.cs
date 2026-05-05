using ErrorOr;
using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Trips.Commands;
using HSTS.Application.Trips.Dtos;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Trips;

public class UpdateSavedTripCommandTests
{
    [Fact]
    public async Task Handle_CompletedTrip_ReturnsForbidden()
    {
        var user = new User { Id = 10, AccountId = 20, FullName = "Trip Leader" };
        var trip = new Trip
        {
            Id = 1,
            TripName = "Completed Trip",
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(1),
            GroupSize = 2,
            Currency = "VND",
            Status = TripStatus.Completed,
            TripMembers = new List<TripMember>
            {
                new() { Id = 100, TripId = 1, UserId = 10, Role = TripRole.Leader },
            },
        };

        var currentUser = new Mock<ICurrentUserService>();
        currentUser.SetupGet(x => x.UserId).Returns(user.Id);

        var context = MockDbContextFactory.Create()
            .WithUsers(user)
            .WithTrips(trip)
            .Build();

        var handler = new UpdateSavedTripCommandHandler(context.Object, currentUser.Object);

        var result = await handler.Handle(new UpdateSavedTripCommand(trip.Id, CreateValidRequest()), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Trip.Completed");
        result.FirstError.Type.Should().Be(ErrorType.Forbidden);
        context.Verify(x => x.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    private static SaveTripRequest CreateValidRequest() =>
        new(
            "Updated Trip",
            null,
            DateTime.UtcNow.Date,
            DateTime.UtcNow.Date.AddDays(1),
            2,
            "VND",
            new List<SaveTripDayRequest>
            {
                new(
                    1,
                    DateTime.UtcNow.Date,
                    "Day 1",
                    null,
                    0,
                    new List<SaveTripActivityRequest>
                    {
                        new(
                            ActivityType.Visit,
                            "Visit",
                            new TimeOnly(8, 0),
                            new TimeOnly(9, 0),
                            null,
                            null,
                            new SaveCustomLocationRequest("Custom Place", 10, 106, null, null, 1),
                            null,
                            new SaveTripActivityBudgetRequest(0, null, null)),
                    }),
            },
            new SaveTripSummaryRequest(0, 0, 0, 0, 0, 0, 0, 0, null));
}
