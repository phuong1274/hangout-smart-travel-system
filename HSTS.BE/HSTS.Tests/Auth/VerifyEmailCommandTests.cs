using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class VerifyEmailCommandTests
{
    [Fact]
    public async Task Handle_InvalidOrExpiredOtp_ReturnsValidation()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new VerifyEmailCommandHandler(ctx.Object);

        var result = await handler.Handle(new VerifyEmailCommand("user@test.com", "000000"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Otp.Invalid");
    }

    [Fact]
    public async Task Handle_ValidOtp_AccountNotFound_ReturnsNotFound()
    {
        var otp = AuthFakes.ValidOtp("user@test.com", OtpType.EmailVerification);
        otp.Code = "123456";
        var ctx = MockDbContextFactory.Create().WithOtps(otp).Build();
        var handler = new VerifyEmailCommandHandler(ctx.Object);

        var result = await handler.Handle(new VerifyEmailCommand("user@test.com", "123456"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.NotFound");
    }

    [Fact]
    public async Task Handle_ValidOtpAndAccount_ActivatesAccountAndMarksOtpUsed()
    {
        var account = AuthFakes.PendingAccount("user@test.com");
        var otp = AuthFakes.ValidOtp("user@test.com", OtpType.EmailVerification);
        otp.Code = "123456";
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(otp).Build();
        var handler = new VerifyEmailCommandHandler(ctx.Object);

        var result = await handler.Handle(new VerifyEmailCommand("user@test.com", "123456"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        account.Status.Should().Be(AccountStatus.Active);
        otp.IsUsed.Should().BeTrue();
        ctx.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
