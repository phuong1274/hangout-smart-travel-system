using FluentAssertions;
using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Interfaces;

namespace HSTS.Tests.Auth;

public class OnboardingLinkContractTests
{
    [Fact]
    public void EmailService_ExposesOnboardingLinkEmailMethod()
    {
        typeof(IEmailService).GetMethod("SendOnboardingLinkEmailAsync")
            .Should().NotBeNull();
    }

    [Fact]
    public void AppDbContext_ExposesPasswordSetupTokens()
    {
        typeof(IAppDbContext).GetProperty("PasswordSetupTokens")
            .Should().NotBeNull();
    }
}
