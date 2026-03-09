using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class RegisterCommandTests
{
    private readonly Mock<IEmailService> _email = new();
    private readonly Mock<IPasswordHasher> _hasher = new();

    public RegisterCommandTests()
    {
        _hasher.Setup(x => x.Hash(It.IsAny<string>())).Returns("hashed");
    }

    [Fact]
    public async Task Handle_EmailExists_ReturnsConflict()
    {
        var account = AuthFakes.ActiveAccount("user@test.com");
        var ctx = MockDbContextFactory.Create().WithAccounts(account).WithRoles(AuthFakes.TravelerRole()).Build();
        var handler = new RegisterCommandHandler(ctx.Object, _email.Object, _hasher.Object);

        var result = await handler.Handle(new RegisterCommand("user@test.com", "password123", "Test"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Account.EmailExists");
    }

    [Fact]
    public async Task Handle_RoleNotFound_ReturnsFailure()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new RegisterCommandHandler(ctx.Object, _email.Object, _hasher.Object);

        var result = await handler.Handle(new RegisterCommand("new@test.com", "password123", "Test"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Role.NotFound");
    }

    [Fact]
    public async Task Handle_ValidRequest_SavesAndReturnsSuccess()
    {
        var ctx = MockDbContextFactory.Create().WithRoles(AuthFakes.TravelerRole()).Build();
        var handler = new RegisterCommandHandler(ctx.Object, _email.Object, _hasher.Object);

        var result = await handler.Handle(new RegisterCommand("new@test.com", "password123", "Test User"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.Should().Contain("OTP");
        ctx.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task Handle_EmailSendFails_ReturnsFailure()
    {
        var ctx = MockDbContextFactory.Create().WithRoles(AuthFakes.TravelerRole()).Build();
        _email.Setup(x => x.SendOtpEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<OtpType>(), It.IsAny<CancellationToken>()))
              .ThrowsAsync(new Exception("SMTP error"));
        var handler = new RegisterCommandHandler(ctx.Object, _email.Object, _hasher.Object);

        var result = await handler.Handle(new RegisterCommand("new@test.com", "password123", "Test User"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Email.SendFailed");
    }
}
