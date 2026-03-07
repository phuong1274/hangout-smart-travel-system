using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class ResetPasswordCommandTests
{
    private readonly Mock<IPasswordHasher> _hasher = new();

    public ResetPasswordCommandTests()
    {
        _hasher.Setup(x => x.Hash(It.IsAny<string>())).Returns("new-hashed");
    }

    [Fact]
    public async Task Handle_InvalidOtp_ReturnsValidation()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new ResetPasswordCommandHandler(ctx.Object, _hasher.Object);

        var result = await handler.Handle(new ResetPasswordCommand("user@test.com", "000000", "newpass123"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Otp.Invalid");
    }

    [Fact]
    public async Task Handle_ValidOtp_AccountNotFound_ReturnsNotFound()
    {
        var otp = AuthFakes.ValidOtp("user@test.com", OtpType.ForgotPassword);
        otp.Code = "123456";
        var ctx = MockDbContextFactory.Create().WithOtps(otp).Build();
        var handler = new ResetPasswordCommandHandler(ctx.Object, _hasher.Object);

        var result = await handler.Handle(new ResetPasswordCommand("user@test.com", "123456", "newpass123"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.NotFound");
    }

    [Fact]
    public async Task Handle_ValidRequest_UpdatesPasswordAndMarksOtpUsed()
    {
        var account = AuthFakes.ActiveAccount();
        var otp = AuthFakes.ValidOtp(account.Email, OtpType.ForgotPassword);
        otp.Code = "123456";
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(otp).Build();
        var handler = new ResetPasswordCommandHandler(ctx.Object, _hasher.Object);

        var result = await handler.Handle(new ResetPasswordCommand(account.Email, "123456", "newpass123"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        account.PasswordHash.Should().Be("new-hashed");
        otp.IsUsed.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_ValidRequest_RevokesAllActiveRefreshTokens()
    {
        var account = AuthFakes.ActiveAccount();
        var otp = AuthFakes.ValidOtp(account.Email, OtpType.ForgotPassword);
        otp.Code = "123456";
        var token1 = AuthFakes.ActiveRefreshToken(account.Id, "token-1");
        var token2 = AuthFakes.ActiveRefreshToken(account.Id, "token-2");
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(otp).WithRefreshTokens(token1, token2).Build();
        var handler = new ResetPasswordCommandHandler(ctx.Object, _hasher.Object);

        await handler.Handle(new ResetPasswordCommand(account.Email, "123456", "newpass123"), CancellationToken.None);

        token1.RevokedAt.Should().NotBeNull();
        token2.RevokedAt.Should().NotBeNull();
    }
}
