using FluentAssertions;
using HSTS.Application.Common.LoggingInterfaces;
using HSTS.Application.Interfaces;
using HSTS.Application.Users.Commands;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Users;

public class DeactivateUserCommandTests
{
    [Fact]
    public async Task Handle_SelfDeactivate_ReturnsForbidden()
    {
        var account = AuthFakes.ActiveAccount("admin@test.com");
        var role = AuthFakes.AdminRole();
        var user = AuthFakes.UserWithRole(account, role, "Admin User");
        user.Id = 5;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(x => x.UserId).Returns(5);

        var logging = new Mock<ILoggingService>();
        var handler = new DeactivateUserCommandHandler(ctx.Object, current.Object, logging.Object);
        var result = await handler.Handle(new DeactivateUserCommand(5), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("User.DeactivateSelfForbidden");
    }

    [Fact]
    public async Task Handle_LastActiveAdmin_ReturnsConflict()
    {
        var account = AuthFakes.ActiveAccount("admin@test.com");
        var role = AuthFakes.AdminRole();
        var user = AuthFakes.UserWithRole(account, role, "Admin User");
        user.Id = 8;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(x => x.UserId).Returns(99);

        var logging = new Mock<ILoggingService>();
        var handler = new DeactivateUserCommandHandler(ctx.Object, current.Object, logging.Object);
        var result = await handler.Handle(new DeactivateUserCommand(8), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("User.LastAdminDeactivateForbidden");
    }

    [Fact]
    public async Task Handle_ValidTarget_SoftDeletesUserAndAccountAndRevokesRefreshTokens()
    {
        var adminAccount = AuthFakes.ActiveAccount("admin@test.com");
        adminAccount.Id = 1;
        var targetAccount = AuthFakes.ActiveAccount("target@test.com");
        targetAccount.Id = 2;
        var adminRole = AuthFakes.AdminRole();
        var travelerRole = AuthFakes.TravelerRole();

        var adminUser = AuthFakes.UserWithRole(adminAccount, adminRole, "Admin");
        adminUser.Id = 10;
        adminUser.AccountId = adminAccount.Id;

        var targetUser = AuthFakes.UserWithRole(targetAccount, travelerRole, "Target");
        targetUser.Id = 11;
        targetUser.AccountId = targetAccount.Id;

        var token = AuthFakes.ActiveRefreshToken(targetAccount.Id, "refresh-token");

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(adminAccount, targetAccount)
            .WithUsers(adminUser, targetUser)
            .WithRoles(adminRole, travelerRole)
            .WithRefreshTokens(token)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(x => x.UserId).Returns(adminUser.Id);

        var logging = new Mock<ILoggingService>();
        var handler = new DeactivateUserCommandHandler(ctx.Object, current.Object, logging.Object);
        var result = await handler.Handle(new DeactivateUserCommand(targetUser.Id), default);

        result.IsError.Should().BeFalse();
        targetUser.IsDeleted.Should().BeTrue();
        targetAccount.IsDeleted.Should().BeTrue();
        token.RevokedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_LoggingFails_StillReturnsSuccess()
    {
        var adminAccount = AuthFakes.ActiveAccount("admin@test.com");
        adminAccount.Id = 1;
        var targetAccount = AuthFakes.ActiveAccount("target@test.com");
        targetAccount.Id = 2;
        var adminRole = AuthFakes.AdminRole();
        var travelerRole = AuthFakes.TravelerRole();

        var adminUser = AuthFakes.UserWithRole(adminAccount, adminRole, "Admin");
        adminUser.Id = 10;
        adminUser.AccountId = adminAccount.Id;

        var targetUser = AuthFakes.UserWithRole(targetAccount, travelerRole, "Target");
        targetUser.Id = 11;
        targetUser.AccountId = targetAccount.Id;

        var token = AuthFakes.ActiveRefreshToken(targetAccount.Id, "refresh-token");

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(adminAccount, targetAccount)
            .WithUsers(adminUser, targetUser)
            .WithRoles(adminRole, travelerRole)
            .WithRefreshTokens(token)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(x => x.UserId).Returns(adminUser.Id);

        var logging = new Mock<ILoggingService>();
        logging.Setup(x => x.LogActivityAsync(It.IsAny<string>())).ThrowsAsync(new Exception("logging failure"));
        var handler = new DeactivateUserCommandHandler(ctx.Object, current.Object, logging.Object);
        var result = await handler.Handle(new DeactivateUserCommand(targetUser.Id), default);

        result.IsError.Should().BeFalse();
        targetUser.IsDeleted.Should().BeTrue();
        targetAccount.IsDeleted.Should().BeTrue();
        token.RevokedAt.Should().NotBeNull();
    }
}
