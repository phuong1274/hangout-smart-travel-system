using FluentAssertions;
using HSTS.Application.Common.LoggingInterfaces;
using HSTS.Application.Users.Commands;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Users;

public class UnbanUserCommandTests
{
    [Fact]
    public async Task Handle_BannedUser_SetsAccountActive()
    {
        var account = AuthFakes.BannedAccount("target@test.com");
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role, "Target");
        user.Id = 11;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();

        var logging = new Mock<ILoggingService>();
        var handler = new UnbanUserCommandHandler(ctx.Object, logging.Object);
        var result = await handler.Handle(new UnbanUserCommand(user.Id), default);

        result.IsError.Should().BeFalse();
        account.Status.Should().Be(HSTS.Domain.Enums.AccountStatus.Active);
    }

    [Fact]
    public async Task Handle_LoggingFails_StillReturnsSuccess()
    {
        var account = AuthFakes.BannedAccount("target@test.com");
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role, "Target");
        user.Id = 11;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();

        var logging = new Mock<ILoggingService>();
        logging.Setup(x => x.LogActivityAsync(It.IsAny<string>())).ThrowsAsync(new Exception("logging failure"));
        var handler = new UnbanUserCommandHandler(ctx.Object, logging.Object);
        var result = await handler.Handle(new UnbanUserCommand(user.Id), default);

        result.IsError.Should().BeFalse();
        account.Status.Should().Be(HSTS.Domain.Enums.AccountStatus.Active);
    }
}
