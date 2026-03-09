using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class ForgotPasswordCommandTests
{
    private readonly Mock<IEmailService> _email = new();

    [Fact]
    public async Task Handle_AccountNotFound_ReturnsNotFound()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new ForgotPasswordCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ForgotPasswordCommand("missing@test.com"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.NotFound");
    }

    [Fact]
    public async Task Handle_BannedAccount_ReturnsForbidden()
    {
        var account = AuthFakes.BannedAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ForgotPasswordCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ForgotPasswordCommand(account.Email), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.Banned");
    }

    [Fact]
    public async Task Handle_RateLimitExceeded_ReturnsConflict()
    {
        var account = AuthFakes.ActiveAccount();
        var recentOtps = Enumerable.Range(0, 4)
            .Select(_ => AuthFakes.ValidOtp(account.Email, OtpType.ForgotPassword))
            .ToArray();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(recentOtps).Build();
        var handler = new ForgotPasswordCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ForgotPasswordCommand(account.Email), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Otp.TooManyRequests");
    }

    [Fact]
    public async Task Handle_CooldownActive_ReturnsConflict()
    {
        var account = AuthFakes.ActiveAccount();
        var recentOtp = AuthFakes.ValidOtp(account.Email, OtpType.ForgotPassword);
        recentOtp.CreatedAt = DateTime.UtcNow.AddSeconds(-30);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(recentOtp).Build();
        var handler = new ForgotPasswordCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ForgotPasswordCommand(account.Email), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Otp.CooldownActive");
    }

    [Fact]
    public async Task Handle_ValidRequest_SendsOtpAndReturnsResult()
    {
        var account = AuthFakes.ActiveAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ForgotPasswordCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ForgotPasswordCommand(account.Email), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.Message.Should().Contain("OTP");
        _email.Verify(x => x.SendOtpEmailAsync(account.Email, It.IsAny<string>(), OtpType.ForgotPassword, It.IsAny<CancellationToken>()), Times.Once);
    }
}
