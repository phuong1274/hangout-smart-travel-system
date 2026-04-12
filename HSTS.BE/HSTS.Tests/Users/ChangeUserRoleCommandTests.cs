using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Users.Commands;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Users;

public class ChangeUserRoleCommandTests
{
    [Fact]
    public async Task Handle_DifferentTarget_ReplacesRoleAndRevokesRefreshTokens()
    {
        var account = AuthFakes.ActiveAccount("partner@test.com");
        account.Id = 2;
        var oldRole = AuthFakes.PartnerRole();
        oldRole.Id = 3;
        var newRole = AuthFakes.AdminRole();
        newRole.Id = 4;

        var user = AuthFakes.UserWithRole(account, oldRole, "Partner User");
        user.Id = 10;
        user.AccountId = account.Id;
        user.UserRoles = new List<HSTS.Domain.Entities.UserRole>
        {
            new() { UserId = user.Id, RoleId = oldRole.Id, Role = oldRole }
        };

        var token = AuthFakes.ActiveRefreshToken(account.Id, "refresh-token");

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(oldRole, newRole)
            .WithRefreshTokens(token)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(999);

        var handler = new ChangeUserRoleCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new ChangeUserRoleCommand(UserId: 10, RoleId: 4), default);

        result.IsError.Should().BeFalse();
        user.UserRoles.Select(r => r.RoleId).Should().ContainSingle().Which.Should().Be(4);
        token.RevokedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_SelfRoleChange_ReturnsForbidden()
    {
        var account = AuthFakes.ActiveAccount("admin@test.com");
        var adminRole = AuthFakes.AdminRole();
        var user = AuthFakes.UserWithRole(account, adminRole, "Admin User");
        user.Id = 5;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(adminRole)
            .Build();

        var current = new Mock<ICurrentUserService>();
        current.SetupGet(c => c.UserId).Returns(5);

        var handler = new ChangeUserRoleCommandHandler(ctx.Object, current.Object);
        var result = await handler.Handle(new ChangeUserRoleCommand(UserId: 5, RoleId: adminRole.Id), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("UserRole.SelfChangeForbidden");
    }
}
