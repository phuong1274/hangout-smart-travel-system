using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Interfaces;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class ChangePasswordCommandTests
{
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();

    public ChangePasswordCommandTests()
    {
        _currentUser.Setup(x => x.AccountId).Returns(1);
        _hasher.Setup(x => x.Hash(It.IsAny<string>())).Returns("new-hashed");
    }

    [Fact]
    public async Task Handle_AccountNotFound_ReturnsNotFound()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new ChangePasswordCommandHandler(ctx.Object, _currentUser.Object, _hasher.Object);

        var result = await handler.Handle(new ChangePasswordCommand("current", "newpass123"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.NotFound");
    }

    [Fact]
    public async Task Handle_GoogleAccount_NoPassword_ReturnsValidation()
    {
        var account = AuthFakes.GoogleAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ChangePasswordCommandHandler(ctx.Object, _currentUser.Object, _hasher.Object);

        var result = await handler.Handle(new ChangePasswordCommand("current", "newpass123"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.NoPassword");
    }

    [Fact]
    public async Task Handle_WrongCurrentPassword_ReturnsValidation()
    {
        var account = AuthFakes.ActiveAccount();
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ChangePasswordCommandHandler(ctx.Object, _currentUser.Object, _hasher.Object);

        var result = await handler.Handle(new ChangePasswordCommand("wrong", "newpass123"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.WrongPassword");
    }

    [Fact]
    public async Task Handle_SamePassword_ReturnsValidation()
    {
        var account = AuthFakes.ActiveAccount();
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(true);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ChangePasswordCommandHandler(ctx.Object, _currentUser.Object, _hasher.Object);

        var result = await handler.Handle(new ChangePasswordCommand("samepass", "samepass"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.SamePassword");
    }

    [Fact]
    public async Task Handle_ValidRequest_UpdatesPasswordAndRevokesTokens()
    {
        var account = AuthFakes.ActiveAccount();
        var token = AuthFakes.ActiveRefreshToken(account.Id);
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(true);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithRefreshTokens(token).Build();
        var handler = new ChangePasswordCommandHandler(ctx.Object, _currentUser.Object, _hasher.Object);

        var result = await handler.Handle(new ChangePasswordCommand("current", "newpass123"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        account.PasswordHash.Should().Be("new-hashed");
        token.RevokedAt.Should().NotBeNull();
    }
}
