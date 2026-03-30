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
    private readonly Mock<IEmailDomainPolicy> _policy = EmailPolicyMockFactory.AllowAll();

    [Fact]
    public async Task Handle_AccountNotFound_ReturnsNotFound()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, _policy.Object);

        var result = await handler.Handle(new ResendOtpCommand("missing@test.com", OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.NotFound");
    }

    [Fact]
    public async Task Handle_DisallowedUnknownEmail_ReturnsValidation()
    {
        var policy = EmailPolicyMockFactory.AllowOnly("allowed@gmail.com");
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, policy.Object);

        var result = await handler.Handle(new ResendOtpCommand("trash@disposable.test", OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Email.DomainNotAllowed");
    }

    [Fact]
    public async Task Handle_AlreadyVerified_ReturnsValidation()
    {
        var account = AuthFakes.ActiveAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, _policy.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.AlreadyVerified");
    }

    [Fact]
    public async Task Handle_BannedAccount_ReturnsForbidden()
    {
        var account = AuthFakes.BannedAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, _policy.Object);

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
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, _policy.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Otp.TooManyRequests");
    }

    [Fact]
    public async Task Handle_CooldownActive_ReturnsConflict()
    {
        var account = AuthFakes.PendingAccount();
        var recentOtp = AuthFakes.ValidOtp(account.Email, OtpType.EmailVerification);
        recentOtp.CreatedAt = DateTime.UtcNow.AddSeconds(-30);
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(recentOtp).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, _policy.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Otp.CooldownActive");
    }

    [Fact]
    public async Task Handle_ValidRequest_SendsOtpAndReturnsResult()
    {
        var account = AuthFakes.PendingAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, _policy.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.RemainingResends.Should().Be(3);
        _email.Verify(x => x.SendOtpEmailAsync(account.Email, It.IsAny<string>(), OtpType.EmailVerification, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_LegacyAccountOutsideAllowlist_IsStillAllowed()
    {
        var account = AuthFakes.PendingAccount("legacy@old-domain.test");
        var policy = EmailPolicyMockFactory.AllowOnly("allowed@gmail.com");
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, policy.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_EmailSendFails_ReturnsFailure()
    {
        var account = AuthFakes.PendingAccount();
        var ctx = MockDbContextFactory.Create().WithAccounts(account).Build();
        _email.Setup(x => x.SendOtpEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<OtpType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("provider failure"));
        var handler = new ResendOtpCommandHandler(ctx.Object, _email.Object, _policy.Object);

        var result = await handler.Handle(new ResendOtpCommand(account.Email, OtpType.EmailVerification), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Email.SendFailed");
    }
}
