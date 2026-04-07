using FluentAssertions;
using HSTS.Application.Users.Queries;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Users;

public class GetUserByIdQueryTests
{
    [Fact]
    public async Task Handle_UserExists_ReturnsAdminDetailDto()
    {
        var account = AuthFakes.ActiveAccount("traveler@test.com");
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role, "Traveler Test");

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithRoles(role)
            .WithUsers(user)
            .Build();

        var handler = new GetUserByIdQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetUserByIdQuery(user.Id), default);

        result.IsError.Should().BeFalse();
        result.Value.Email.Should().Be("traveler@test.com");
        result.Value.Roles.Should().Contain("TRAVELER");
    }

    [Fact]
    public async Task Handle_UserMissing_ReturnsNotFound()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new GetUserByIdQueryHandler(ctx.Object);

        var result = await handler.Handle(new GetUserByIdQuery(999), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("User.NotFound");
    }
}
