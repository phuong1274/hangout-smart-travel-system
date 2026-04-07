using FluentAssertions;
using HSTS.Application.Common.LoggingInterfaces;
using HSTS.Application.Users.Commands;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Users;

public class RestoreUserCommandTests
{
    [Fact]
    public async Task Handle_DeactivatedUser_RestoresUserAndAccount()
    {
        var account = AuthFakes.ActiveAccount("target@test.com");
        account.IsDeleted = true;
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role, "Target");
        user.Id = 11;
        user.IsDeleted = true;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();

        var logging = new Mock<ILoggingService>();
        var handler = new RestoreUserCommandHandler(ctx.Object, logging.Object);
        var result = await handler.Handle(new RestoreUserCommand(user.Id), default);

        result.IsError.Should().BeFalse();
        user.IsDeleted.Should().BeFalse();
        account.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_BannedAndDeactivatedUser_ClearsDeactivationButKeepsBannedStatus()
    {
        var account = AuthFakes.BannedAccount("target@test.com");
        account.IsDeleted = true;
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role, "Target");
        user.Id = 12;
        user.IsDeleted = true;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();

        var logging = new Mock<ILoggingService>();
        var handler = new RestoreUserCommandHandler(ctx.Object, logging.Object);
        var result = await handler.Handle(new RestoreUserCommand(user.Id), default);

        result.IsError.Should().BeFalse();
        user.IsDeleted.Should().BeFalse();
        account.IsDeleted.Should().BeFalse();
        account.Status.Should().Be(HSTS.Domain.Enums.AccountStatus.Banned);
    }

    [Fact]
    public async Task Handle_LoggingFails_StillReturnsSuccess()
    {
        var account = AuthFakes.ActiveAccount("target@test.com");
        account.IsDeleted = true;
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role, "Target");
        user.Id = 11;
        user.IsDeleted = true;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();

        var logging = new Mock<ILoggingService>();
        logging.Setup(x => x.LogActivityAsync(It.IsAny<string>())).ThrowsAsync(new Exception("logging failure"));
        var handler = new RestoreUserCommandHandler(ctx.Object, logging.Object);
        var result = await handler.Handle(new RestoreUserCommand(user.Id), default);

        result.IsError.Should().BeFalse();
        user.IsDeleted.Should().BeFalse();
        account.IsDeleted.Should().BeFalse();
    }
}
