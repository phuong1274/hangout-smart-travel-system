using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class VerifyForgotPasswordOtpCommandTests
{
    [Fact]
    public async Task Handle_ValidForgotPasswordOtp_ReturnsSuccess()
    {
        var otp = AuthFakes.ValidOtp("user@test.com", OtpType.ForgotPassword);
        otp.Code = "123456";
        var ctx = MockDbContextFactory.Create().WithOtps(otp).Build();
        var policy = EmailPolicyMockFactory.AllowAll();
        var handler = new VerifyForgotPasswordOtpCommandHandler(ctx.Object, policy.Object);

        var result = await handler.Handle(new VerifyForgotPasswordOtpCommand("user@test.com", "123456"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.Should().Be("OTP verified successfully.");
    }

    [Fact]
    public async Task Handle_ValidOnboardingOtp_ReturnsSuccess()
    {
        var account = AuthFakes.ActiveAccount();
        account.PasswordHash = null;
        var otp = AuthFakes.ValidOtp(account.Email, OtpType.OnboardingPasswordSetup);
        otp.Code = "123456";
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithOtps(otp).Build();
        var policy = EmailPolicyMockFactory.AllowAll();
        var handler = new VerifyForgotPasswordOtpCommandHandler(ctx.Object, policy.Object);

        var result = await handler.Handle(new VerifyForgotPasswordOtpCommand(account.Email, "123456"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.Should().Be("OTP verified successfully.");
    }
}
