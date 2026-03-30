using HSTS.Application.Auth.Interfaces;
using Moq;

namespace HSTS.Tests.Helpers;

public static class EmailPolicyMockFactory
{
    public static Mock<IEmailDomainPolicy> AllowAll()
    {
        var mock = new Mock<IEmailDomainPolicy>();
        mock.Setup(x => x.IsAllowedEmail(It.IsAny<string>())).Returns(true);
        return mock;
    }

    public static Mock<IEmailDomainPolicy> AllowOnly(params string[] emails)
    {
        var allowed = emails.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var mock = new Mock<IEmailDomainPolicy>();
        mock.Setup(x => x.IsAllowedEmail(It.IsAny<string>()))
            .Returns((string email) => allowed.Contains(email));
        return mock;
    }
}
