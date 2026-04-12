using FluentAssertions;
using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Auth.Services;
using HSTS.Domain.Entities;
using HSTS.Domain.Enums;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class AccountAccessPolicyTests
{
    [Fact]
    public async Task CanAccessAsync_ActiveAccountAndUser_ReturnsTrue()
    {
        var account = AuthFakes.ActiveAccount();
        var user = AuthFakes.UserFor(account);
        var loader = new Mock<IAccountAccessStateLoader>();
        loader.Setup(x => x.LoadAsync(account.Id, CancellationToken.None))
            .ReturnsAsync(new AccountAccessState(account, user));
        var policy = new AccountAccessPolicy(loader.Object);

        var result = await policy.CanAccessAsync(account.Id, CancellationToken.None);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanAccessAsync_BannedAccount_ReturnsFalse()
    {
        var account = AuthFakes.BannedAccount();
        var user = AuthFakes.UserFor(account);
        var loader = new Mock<IAccountAccessStateLoader>();
        loader.Setup(x => x.LoadAsync(account.Id, CancellationToken.None))
            .ReturnsAsync(new AccountAccessState(account, user));
        var policy = new AccountAccessPolicy(loader.Object);

        var result = await policy.CanAccessAsync(account.Id, CancellationToken.None);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanAccessAsync_DeletedAccount_ReturnsFalse()
    {
        var account = AuthFakes.ActiveAccount();
        account.IsDeleted = true;
        var user = AuthFakes.UserFor(account);
        var loader = new Mock<IAccountAccessStateLoader>();
        loader.Setup(x => x.LoadAsync(account.Id, CancellationToken.None))
            .ReturnsAsync(new AccountAccessState(account, user));
        var policy = new AccountAccessPolicy(loader.Object);

        var result = await policy.CanAccessAsync(account.Id, CancellationToken.None);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanAccessAsync_DeletedUser_ReturnsFalse()
    {
        var account = AuthFakes.ActiveAccount();
        var user = AuthFakes.UserFor(account);
        user.IsDeleted = true;
        var loader = new Mock<IAccountAccessStateLoader>();
        loader.Setup(x => x.LoadAsync(account.Id, CancellationToken.None))
            .ReturnsAsync(new AccountAccessState(account, user));
        var policy = new AccountAccessPolicy(loader.Object);

        var result = await policy.CanAccessAsync(account.Id, CancellationToken.None);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanAccessAsync_MissingUser_ReturnsFalse()
    {
        var account = AuthFakes.ActiveAccount();
        var loader = new Mock<IAccountAccessStateLoader>();
        loader.Setup(x => x.LoadAsync(account.Id, CancellationToken.None))
            .ReturnsAsync(new AccountAccessState(account, null));
        var policy = new AccountAccessPolicy(loader.Object);

        var result = await policy.CanAccessAsync(account.Id, CancellationToken.None);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanAccessAsync_MissingAccount_ReturnsFalse()
    {
        var loader = new Mock<IAccountAccessStateLoader>();
        loader.Setup(x => x.LoadAsync(123, CancellationToken.None))
            .ReturnsAsync(new AccountAccessState(null, null));
        var policy = new AccountAccessPolicy(loader.Object);

        var result = await policy.CanAccessAsync(123, CancellationToken.None);

        result.Should().BeFalse();
    }
}
