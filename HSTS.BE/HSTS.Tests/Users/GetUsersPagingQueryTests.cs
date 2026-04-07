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
}
