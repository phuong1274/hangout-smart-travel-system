using FluentAssertions;
using HSTS.Application.Auth.Commands;
using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Entities;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Auth;

public class CompleteOnboardingCommandTests
{
    private readonly Mock<IPasswordHasher> _hasher = new();

    public CompleteOnboardingCommandTests()
    {
        _hasher.Setup(x => x.Hash(It.IsAny<string>())).Returns("new-hashed");
    }

    [Fact]
    public async Task Handle_ValidToken_SetsPasswordAndConsumesToken()
    {
        var account = AuthFakes.ActiveAccount();
        account.PasswordHash = null;
        var token = new PasswordSetupToken
        {
            Id = 1,
            AccountId = account.Id,
            Account = account,
            Token = "setup-token",
            ExpiredAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false,
        };

        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithPasswordSetupTokens(token)
            .Build();
        var handler = new CompleteOnboardingCommandHandler(ctx.Object, _hasher.Object);

        var result = await handler.Handle(new CompleteOnboardingCommand("setup-token", "Password@123"), CancellationToken.None);

        result.IsError.Should().BeFalse();
        account.PasswordHash.Should().Be("new-hashed");
        token.IsUsed.Should().BeTrue();
    }
}
