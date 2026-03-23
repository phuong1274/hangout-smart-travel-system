using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class GoogleLoginCommandTests
{
    private readonly Mock<IJwtService> _jwt = new();
    private readonly Mock<IGoogleAuthService> _google = new();
    private readonly Mock<IEmailDomainPolicy> _policy = EmailPolicyMockFactory.AllowAll();

    private static readonly GoogleUserInfo FakeGoogleUser =
        new("google@test.com", "google-id-123", "Google User");

    public GoogleLoginCommandTests()
    {
        _jwt.Setup(x => x.GenerateAccessToken(It.IsAny<Account>(), It.IsAny<User>(), It.IsAny<IList<string>>()))
            .Returns("access-token");
        _jwt.Setup(x => x.GenerateRefreshToken()).Returns("refresh-token");
    }

    [Fact]
    public async Task Handle_InvalidGoogleToken_ReturnsValidation()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((GoogleUserInfo?)null);
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, _policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("bad-token"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.InvalidGoogleToken");
    }

    [Fact]
    public async Task Handle_DisallowedGoogleEmail_ReturnsValidation()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGoogleUser);
        var policy = EmailPolicyMockFactory.AllowOnly("allowed@gmail.com");
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Email.DomainNotAllowed");
    }

    [Fact]
    public async Task Handle_NewUser_RoleNotFound_ReturnsFailure()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGoogleUser);
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, _policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Role.NotFound");
    }

    [Fact]
    public async Task Handle_NewUser_CreatesAccountUserProfileRole()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGoogleUser);

        var role = AuthFakes.TravelerRole();
        var newAccount = new Account
        {
            Id = 0,
            Email = FakeGoogleUser.Email,
            GoogleId = FakeGoogleUser.GoogleId,
            Status = AccountStatus.Active
        };
        var userRole = new UserRole { UserId = 0, RoleId = role.Id, Role = role };
        var newUser = new User
        {
            Id = 0,
            AccountId = 0,
            FullName = FakeGoogleUser.Name,
            Account = newAccount,
            UserRoles = new List<UserRole> { userRole }
        };

        var ctx = MockDbContextFactory.Create()
            .WithRoles(role)
            .WithUsers(newUser)
            .Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, _policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.Email.Should().Be(FakeGoogleUser.Email);
        result.Value.HasGoogleLinked.Should().BeTrue();
        ctx.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task Handle_ExistingPasswordAccountByEmail_ReturnsConflict()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGoogleUser);

        var account = new Account
        {
            Id = 1,
            Email = FakeGoogleUser.Email,
            GoogleId = null,
            PasswordHash = "hashed-password",
            Status = AccountStatus.PendingVerification,
            IsDeleted = false
        };
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role);

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, _policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.GoogleLoginBlocked");
    }

    [Fact]
    public async Task Handle_ExistingPasswordAccountByEmail_DoesNotLinkGoogleId()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGoogleUser);

        var account = new Account
        {
            Id = 1,
            Email = FakeGoogleUser.Email,
            GoogleId = null,
            PasswordHash = "hashed-password",
            Status = AccountStatus.Active,
            IsDeleted = false
        };
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role);

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, _policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        account.GoogleId.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ExistingPendingVerificationPasswordAccountByEmail_RemainsPending()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGoogleUser);

        var account = new Account
        {
            Id = 1,
            Email = FakeGoogleUser.Email,
            GoogleId = null,
            PasswordHash = "hashed-password",
            Status = AccountStatus.PendingVerification,
            IsDeleted = false
        };
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role);

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, _policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        account.Status.Should().Be(AccountStatus.PendingVerification);
    }

    [Fact]
    public async Task Handle_ExistingLinkedAccount_ReturnsAuthResult()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGoogleUser);

        var account = new Account
        {
            Id = 1,
            Email = FakeGoogleUser.Email,
            GoogleId = FakeGoogleUser.GoogleId,
            Status = AccountStatus.Active,
            IsDeleted = false
        };
        var role = AuthFakes.TravelerRole();
        var user = AuthFakes.UserWithRole(account, role);

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .WithRoles(role)
            .Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, _policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        result.Value.HasGoogleLinked.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_BannedAccount_ReturnsForbidden()
    {
        _google.Setup(x => x.VerifyGoogleTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FakeGoogleUser);

        var account = new Account
        {
            Id = 1,
            Email = FakeGoogleUser.Email,
            GoogleId = null,
            Status = AccountStatus.Banned,
            IsDeleted = false
        };

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .Build();
        var handler = new GoogleLoginCommandHandler(ctx.Object, _jwt.Object, _google.Object, _policy.Object);

        var result = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("Auth.Banned");
    }
}
