using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class ResendOtpCommandTests
{
    private readonly Mock<IEmailService> _email = new();

    [Fact]
    public async Task Handle_AccountNotFound_ReturnsNotFound()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ResendOtpCommand("missing@test.com", OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.NotFound");
    }

    [Fact]
    public async Task Handle_AlreadyVerified_ReturnsValidation()
    {
        var account = AuthFakes.ActiveAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.AlreadyVerified");
    }

    [Fact]
    public async Task Handle_BannedAccount_ReturnsForbidden()
    {
        var account = AuthFakes.BannedAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object);

        // Use ForgotPassword type so the AlreadyVerified guard (EmailVerification-only) is skipped
        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.ForgotPassword), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.Banned");
    }

    [Fact]
    public async Task Handle_RateLimitExceeded_ReturnsConflict()
    {
        var account = AuthFakes.PendingAccount();
        var recentOtps = Enumerable.Range(0, 4)
            .Select(_ => AuthFakes.ValidOtp(account.Email, OtpType.EmailVerification))
            .ToArray();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(recentOtps).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Otp.TooManyRequests");
    }

    [Fact]
    public async Task Handle_CooldownActive_ReturnsConflict()
    {
        var account = AuthFakes.PendingAccount();
        var recentOtp = AuthFakes.ValidOtp(account.Email, OtpType.EmailVerification);
        recentOtp.CreatedAt = DateTime.UtcNow.AddSeconds(-30); // within 60s cooldown
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(recentOtp).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Otp.CooldownActive");
    }

    [Fact]
    public async Task Handle_ValidRequest_SendsOtpAndReturnsResult()
    {
        var account = AuthFakes.PendingAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.RemainingResends.Should().Be(3);
        _email.Verify(x => x.SendOtpEmailAsync(account.Email, It.IsAny<string>(), OtpType.EmailVerification, It.IsAny<CancellationToken>()), Times.Once);
    }
}
