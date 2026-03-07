using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class LoginCommandTests
{
    private readonly Mock<IJwtService> _jwt = new();
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<IEmailService> _email = new();

    public LoginCommandTests()
    {
        _jwt.Setup(x => x.GenerateAccessToken(It.IsAny<Account>(), It.IsAny<User>(), It.IsAny<List<string>>()))
            .Returns("access-token");
        _jwt.Setup(x => x.GenerateRefreshToken()).Returns("refresh-token");
    }

    [Fact]
    public async Task Handle_AccountNotFound_ReturnsNotFound()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new LoginCommandHandler(ctx.Object, _jwt.Object, _hasher.Object, _email.Object);

        var result = await handler.Handle(new LoginCommand("missing@test.com", "pass"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.InvalidCredentials");
    }

    [Fact]
    public async Task Handle_GoogleAccount_NoPassword_ReturnsValidation()
    {
        var account = AuthFakes.GoogleAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new LoginCommandHandler(ctx.Object, _jwt.Object, _hasher.Object, _email.Object);

        var result = await handler.Handle(new LoginCommand(account.Email, "pass"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.NoPassword");
    }

    [Fact]
    public async Task Handle_WrongPassword_ReturnsNotFound()
    {
        var account = AuthFakes.ActiveAccount();
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new LoginCommandHandler(ctx.Object, _jwt.Object, _hasher.Object, _email.Object);

        var result = await handler.Handle(new LoginCommand(account.Email, "wrongpass"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.InvalidCredentials");
    }

    [Fact]
    public async Task Handle_PendingVerification_OtpSent_ReturnsForbidden()
    {
        var account = AuthFakes.PendingAccount();
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(true);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new LoginCommandHandler(ctx.Object, _jwt.Object, _hasher.Object, _email.Object);

        var result = await handler.Handle(new LoginCommand(account.Email, "pass"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.EmailNotVerified");
    }

    [Fact]
    public async Task Handle_PendingVerification_RateLimited_ReturnsForbiddenWithDifferentMessage()
    {
        var account = AuthFakes.PendingAccount();
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(true);
        // 4 recent OTPs triggers rate limit
        var recentOtps = Enumerable.Range(0, 4)
            .Select(_ => AuthFakes.ValidOtp(account.Email, OtpType.EmailVerification))
            .ToArray();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(recentOtps).Build();
        var handler = new LoginCommandHandler(ctx.Object, _jwt.Object, _hasher.Object, _email.Object);

        var result = await handler.Handle(new LoginCommand(account.Email, "pass"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.EmailNotVerified");
        result.FirstError.Description.Should().Contain("request a new code");
    }

    [Fact]
    public async Task Handle_BannedAccount_ReturnsForbidden()
    {
        var account = AuthFakes.BannedAccount();
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(true);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new LoginCommandHandler(ctx.Object, _jwt.Object, _hasher.Object, _email.Object);

        var result = await handler.Handle(new LoginCommand(account.Email, "pass"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.Banned");
    }

    [Fact]
    public async Task Handle_ValidCredentials_ReturnsAuthResult()
    {
        var account = AuthFakes.ActiveAccount();
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role);
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(true);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithUsers(user).Build();
        var handler = new LoginCommandHandler(ctx.Object, _jwt.Object, _hasher.Object, _email.Object);

        var result = await handler.Handle(new LoginCommand(account.Email, "pass"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.Email.Should().Be(account.Email);
        result.Value.Roles.Should().Contain("TRAVELER");
    }
}
