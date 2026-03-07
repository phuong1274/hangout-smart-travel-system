using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class RefreshTokenCommandTests
{
    private readonly Mock<IJwtService> _jwt = new();

    public RefreshTokenCommandTests()
    {
        _jwt.Setup(x => x.GenerateAccessToken(It.IsAny<Account>(), It.IsAny<User>(), It.IsAny<IList<string>>()))
            .Returns("new-access-token");
        _jwt.Setup(x => x.GenerateRefreshToken()).Returns("new-refresh-token");
    }

    [Fact]
    public async Task Handle_TokenNotFound_ReturnsUnauthorized()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new RefreshTokenCommandHandler(ctx.Object, _jwt.Object);

        var result = await handler.Handle(new RefreshTokenCommand("missing-token"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.InvalidRefreshToken");
    }

    [Fact]
    public async Task Handle_ExpiredToken_ReturnsUnauthorized()
    {
        var account = AuthFakes.ActiveAccount();
        var token = AuthFakes.ExpiredRefreshToken(account.Id);
        token.Account = account;
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithRefreshTokens(token).Build();
        var handler = new RefreshTokenCommandHandler(ctx.Object, _jwt.Object);

        var result = await handler.Handle(new RefreshTokenCommand(token.Token), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.InvalidRefreshToken");
    }

    [Fact]
    public async Task Handle_DeletedAccount_ReturnsForbidden()
    {
        var account = AuthFakes.ActiveAccount();
        account.IsDeleted = true;
        var token = AuthFakes.ActiveRefreshToken(account.Id);
        token.Account = account;
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithRefreshTokens(token).Build();
        var handler = new RefreshTokenCommandHandler(ctx.Object, _jwt.Object);

        var result = await handler.Handle(new RefreshTokenCommand(token.Token), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.AccountInactive");
    }

    [Fact]
    public async Task Handle_BannedAccount_ReturnsForbidden()
    {
        var account = AuthFakes.BannedAccount();
        var token = AuthFakes.ActiveRefreshToken(account.Id);
        token.Account = account;
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithRefreshTokens(token).Build();
        var handler = new RefreshTokenCommandHandler(ctx.Object, _jwt.Object);

        var result = await handler.Handle(new RefreshTokenCommand(token.Token), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.AccountInactive");
    }

    [Fact]
    public async Task Handle_UserNotFound_ReturnsNotFound()
    {
        var account = AuthFakes.ActiveAccount();
        var token = AuthFakes.ActiveRefreshToken(account.Id);
        token.Account = account;
        // No user seeded
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithRefreshTokens(token).Build();
        var handler = new RefreshTokenCommandHandler(ctx.Object, _jwt.Object);

        var result = await handler.Handle(new RefreshTokenCommand(token.Token), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("User.NotFound");
    }

    [Fact]
    public async Task Handle_ValidToken_RevokesOldAndIssuesNew()
    {
        var account = AuthFakes.ActiveAccount();
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role);
        var token = AuthFakes.ActiveRefreshToken(account.Id);
        token.Account = account;
        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRefreshTokens(token)
            .Build();
        var handler = new RefreshTokenCommandHandler(ctx.Object, _jwt.Object);

        var result = await handler.Handle(new RefreshTokenCommand(token.Token), CancellationToken.None);

        result.IsError.Should().BeFalse();
        token.RevokedAt.Should().NotBeNull();
        result.Value.AccessToken.Should().Be("new-access-token");
    }
}
