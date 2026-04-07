using FluentAssertions;
using HSTS.Application.Users.Queries;
using HSTS.Tests.Helpers;

namespace HSTS.Tests.Users;

public class GetRolesQueryTests
{
    [Fact]
    public async Task Handle_ReturnsAllRolesOrderedByName()
    {
        var admin = AuthFakes.AdminRole();
        var traveler = AuthFakes.TravelerRole();

        var ctx = MockDbContextFactory.Create()
            .WithRoles(admin, traveler)
            .Build();

        var handler = new GetRolesQueryHandler(ctx.Object);
        var result = await handler.Handle(new GetRolesQuery(), default);

        result.IsError.Should().BeFalse();
        result.Value.Should().HaveCount(2);
        result.Value.Select(r => r.Name).Should().Contain(new[] { "ADMIN", "TRAVELER" });
    }
}
