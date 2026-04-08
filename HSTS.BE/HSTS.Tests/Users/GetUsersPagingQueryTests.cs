using FluentAssertions;
using HSTS.Application.Users.Queries;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Users;

public class GetUsersPagingQueryTests
{
    [Fact]
    public async Task Handle_SearchMatchesNameOrEmail_ReturnsPagedItems()
    {
        var account = AuthFakes.ActiveAccount("alice@test.com");
        var role = AuthFakes.AdminRole();
        var user = AuthFakes.UserWithRole(account, role, "Alice Admin");

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithRoles(role)
            .WithUsers(user)
            .Build();

        var handler = new GetUsersPagingQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetUsersPagingQuery(PageIndex: 1, PageSize: 10, SearchTerm: "alice"), default);

        result.IsError.Should().BeFalse();
        result.Value.TotalCount.Should().Be(1);
        result.Value.Items.Should().ContainSingle(x => x.Email == "alice@test.com");
    }

    [Fact]
    public void Query_ExposesRoleFilter()
    {
        typeof(GetUsersPagingQuery).GetProperty("Role")
            .Should().NotBeNull();
    }

    [Fact]
    public void Query_ExposesStatusFilter()
    {
        typeof(GetUsersPagingQuery).GetProperty("Status")
            .Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_RoleFilter_ReturnsOnlyUsersWithMatchingRole()
    {
        var adminRole = AuthFakes.AdminRole();
        var travelerRole = AuthFakes.TravelerRole();
        var adminAccount = AuthFakes.ActiveAccount("admin@test.com");
        var travelerAccount = AuthFakes.ActiveAccount("traveler@test.com");
        var adminUser = AuthFakes.UserWithRole(adminAccount, adminRole, "Admin User");
        var travelerUser = AuthFakes.UserWithRole(travelerAccount, travelerRole, "Traveler User");

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(adminAccount, travelerAccount)
            .WithRoles(adminRole, travelerRole)
            .WithUsers(adminUser, travelerUser)
            .Build();

        var handler = new GetUsersPagingQueryHandler(ctx.Object);
        var query = (GetUsersPagingQuery)Activator.CreateInstance(typeof(GetUsersPagingQuery), 1, 10, null, "ADMIN", null)!;
        var result = await handler.Handle(query, default);

        result.IsError.Should().BeFalse();
        result.Value.TotalCount.Should().Be(1);
        result.Value.Items.Should().ContainSingle(x => x.Email == "admin@test.com");
        result.Value.Items.Should().NotContain(x => x.Email == "traveler@test.com");
    }

    [Fact]
    public async Task Handle_StatusFilter_ReturnsOnlyUsersWithMatchingLifecycleState()
    {
        var activeAccount = AuthFakes.ActiveAccount("active@test.com");
        var bannedAccount = AuthFakes.BannedAccount("banned@test.com");
        var role = AuthFakes.TravelerRole();
        var activeUser = AuthFakes.UserWithRole(activeAccount, role, "Active User");
        var bannedUser = AuthFakes.UserWithRole(bannedAccount, role, "Banned User");

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(activeAccount, bannedAccount)
            .WithRoles(role)
            .WithUsers(activeUser, bannedUser)
            .Build();

        var handler = new GetUsersPagingQueryHandler(ctx.Object);
        var query = (GetUsersPagingQuery)Activator.CreateInstance(typeof(GetUsersPagingQuery), 1, 10, null, null, "Banned")!;
        var result = await handler.Handle(query, default);

        result.IsError.Should().BeFalse();
        result.Value.TotalCount.Should().Be(1);
        result.Value.Items.Should().ContainSingle(x => x.Email == "banned@test.com" && x.Status == "Banned");
        result.Value.Items.Should().NotContain(x => x.Email == "active@test.com");
    }

    [Fact]
    public async Task Handle_DeactivatedUser_RemainsVisibleWithExplicitGovernanceState()
    {
        var account = AuthFakes.ActiveAccount("deactivated@test.com");
        account.IsDeleted = true;
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role, "Deactivated User");
        user.IsDeleted = true;

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithRoles(role)
            .WithUsers(user)
            .Build();

        var handler = new GetUsersPagingQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetUsersPagingQuery(), default);

        result.IsError.Should().BeFalse();
        result.Value.Items.Should().ContainSingle(x => x.Email == "deactivated@test.com" && x.Status == "Deactivated");
    }
}
