using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class LogoutCommandTests
{
    [Fact]
    public async Task Handle_TokenNotFound_StillReturnsSuccess()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new LogoutCommandHandler(ctx.Object);

        var result = await handler.Handle(new LogoutCommand("nonexistent-token"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.Should().Contain("Logged out");
        ctx.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ValidToken_RevokesTokenAndSaves()
    {
        var token = AuthFakes.ActiveRefreshToken(1, "valid-token");
        var ctx = MockDbContextFactory.Create().WithRefreshTokens(token).Build();
        var handler = new LogoutCommandHandler(ctx.Object);

        var result = await handler.Handle(new LogoutCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        token.RevokedAt.Should().NotBeNull();
        ctx.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
