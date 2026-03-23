using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Users.Commands;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Users;

public class UpdateMyInfoCommandTests
{
    private readonly Mock<ICurrentUserService> _currentUser = new();

    public UpdateMyInfoCommandTests()
    {
        _currentUser.Setup(x => x.UserId).Returns(1);
    }

    [Fact]
    public async Task Handle_UserNotFound_ReturnsNotFound()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new UpdateMyInfoCommandHandler(ctx.Object, _currentUser.Object);

        var result = await handler.Handle(
            new UpdateMyInfoCommand("New Name", null, null, null, null),
            CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("User.NotFound");
    }

    [Fact]
    public async Task Handle_ValidBio_SavesBioOnUser()
    {
        var account = AuthFakes.ActiveAccount();
        var user = AuthFakes.UserFor(account);
        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .Build();
        var handler = new UpdateMyInfoCommandHandler(ctx.Object, _currentUser.Object);

        var result = await handler.Handle(
            new UpdateMyInfoCommand("New Name", "I love travel", null, null, null),
            CancellationToken.None);

        result.IsError.Should().BeFalse();
        user.Bio.Should().Be("I love travel");
        user.FullName.Should().Be("New Name");
    }

    [Fact]
    public async Task Handle_NullBio_ClearsBioOnUser()
    {
        var account = AuthFakes.ActiveAccount();
        var user = AuthFakes.UserFor(account);
        user.Bio = "Old bio";
        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .Build();
        var handler = new UpdateMyInfoCommandHandler(ctx.Object, _currentUser.Object);

        var result = await handler.Handle(
            new UpdateMyInfoCommand("Name", null, null, null, null),
            CancellationToken.None);

        result.IsError.Should().BeFalse();
        user.Bio.Should().BeNull();
    }
}
