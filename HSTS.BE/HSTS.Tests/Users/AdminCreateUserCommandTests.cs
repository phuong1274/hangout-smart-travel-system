using FluentAssertions;
using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Common.LoggingInterfaces;
using HSTS.Application.Users.Commands;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Users;

public class AdminCreateUserCommandTests
{
    private readonly Mock<IEmailService> _email = new();
    private readonly Mock<IEmailDomainPolicy> _policy = EmailPolicyMockFactory.AllowAll();
    private readonly Mock<ILoggingService> _logging = new();

    [Fact]
    public async Task Handle_EmailExists_ReturnsConflict()
    {
        var account = AuthFakes.ActiveAccount("existing@test.com");
        var role = AuthFakes.TravelerRole();
        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithRoles(role)
            .Build();

        var handler = new AdminCreateUserCommandHandler(ctx.Object, _email.Object, _policy.Object, _logging.Object);
        var result = await handler.Handle(new AdminCreateUserCommand("existing@test.com", "New User", role.Id), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.EmailExists");
    }

    [Fact]
    public async Task Handle_ValidRequest_DoesNotReuseForgotPasswordOtpTypeForOnboarding()
    {
        var role = AuthFakes.PartnerRole();
        var ctx = MockDbContextFactory.Create()
            .WithRoles(role)
            .Build();

        var handler = new AdminCreateUserCommandHandler(ctx.Object, _email.Object, _policy.Object, _logging.Object);
        var result = await handler.Handle(new AdminCreateUserCommand("new-user@test.com", "New User", role.Id), default);

        result.IsError.Should().BeFalse();
        ctx.Verify(x => x.Users.Add(It.IsAny<HSTS.Domain.Entities.User>()), Times.Once);
        ctx.Verify(x => x.Otps.Add(It.Is<HSTS.Domain.Entities.Otp>(o => o.Email == "new-user@test.com" && o.Type == OtpType.ForgotPassword)), Times.Never);
        _email.Verify(x => x.SendOtpEmailAsync("new-user@test.com", It.IsAny<string>(), OtpType.ForgotPassword, It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ValidRequest_UsesDedicatedOnboardingOtpType()
    {
        var onboardingOtpType = (OtpType)2;
        var role = AuthFakes.PartnerRole();
        var ctx = MockDbContextFactory.Create()
            .WithRoles(role)
            .Build();

        var handler = new AdminCreateUserCommandHandler(ctx.Object, _email.Object, _policy.Object, _logging.Object);
        var result = await handler.Handle(new AdminCreateUserCommand("new-user@test.com", "New User", role.Id), default);

        result.IsError.Should().BeFalse();
        ctx.Verify(x => x.Otps.Add(It.Is<HSTS.Domain.Entities.Otp>(o => o.Email == "new-user@test.com" && o.Type == onboardingOtpType)), Times.Once);
        _email.Verify(x => x.SendOtpEmailAsync("new-user@test.com", It.IsAny<string>(), onboardingOtpType, It.IsAny<CancellationToken>()), Times.Once);
    }



    [Fact]
    public async Task Handle_EmailSendFails_DoesNotPersistBlockingAccountState()
    {
        var role = AuthFakes.PartnerRole();
        var ctx = MockDbContextFactory.Create()
            .WithRoles(role)
            .Build();
        _email.Setup(x => x.SendOtpEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<OtpType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("provider failure"));

        var handler = new AdminCreateUserCommandHandler(ctx.Object, _email.Object, _policy.Object, _logging.Object);
        var result = await handler.Handle(new AdminCreateUserCommand("new-user@test.com", "New User", role.Id), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Email.SendFailed");
        ctx.Verify(x => x.Users.Add(It.IsAny<HSTS.Domain.Entities.User>()), Times.Never);
        ctx.Verify(x => x.Otps.Add(It.IsAny<HSTS.Domain.Entities.Otp>()), Times.Never);
        ctx.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_EmailSendFails_LogsErrorAndReturnsFailure()
    {
        var role = AuthFakes.PartnerRole();
        var ctx = MockDbContextFactory.Create()
            .WithRoles(role)
            .Build();
        _email.Setup(x => x.SendOtpEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<OtpType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("provider failure"));

        var handler = new AdminCreateUserCommandHandler(ctx.Object, _email.Object, _policy.Object, _logging.Object);
        var result = await handler.Handle(new AdminCreateUserCommand("new-user@test.com", "New User", role.Id), default);

        result.IsError.Should().BeTrue();
        _logging.Verify(x => x.LogErrorAsync(It.Is<string>(s => s.Contains("onboarding email") || s.Contains("provider failure")), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Handle_LoggingFails_AfterCommit_StillReturnsSuccess()
    {
        var role = AuthFakes.PartnerRole();
        var ctx = MockDbContextFactory.Create()
            .WithRoles(role)
            .Build();
        _logging.Setup(x => x.LogActivityAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("logging failure"));

        var handler = new AdminCreateUserCommandHandler(ctx.Object, _email.Object, _policy.Object, _logging.Object);
        var result = await handler.Handle(new AdminCreateUserCommand("new-user@test.com", "New User", role.Id), default);

        result.IsError.Should().BeFalse();
        ctx.Verify(x => x.Users.Add(It.IsAny<HSTS.Domain.Entities.User>()), Times.Once);
        ctx.Verify(x => x.Otps.Add(It.IsAny<HSTS.Domain.Entities.Otp>()), Times.Once);
        ctx.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_EmailSendAndErrorLoggingFail_StillReturnsEmailFailure()
    {
        var role = AuthFakes.PartnerRole();
        var ctx = MockDbContextFactory.Create()
            .WithRoles(role)
            .Build();
        _email.Setup(x => x.SendOtpEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<OtpType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("provider failure"));
        _logging.Setup(x => x.LogErrorAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("logging failure"));

        var handler = new AdminCreateUserCommandHandler(ctx.Object, _email.Object, _policy.Object, _logging.Object);
        var result = await handler.Handle(new AdminCreateUserCommand("new-user@test.com", "New User", role.Id), default);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Email.SendFailed");
    }
}
