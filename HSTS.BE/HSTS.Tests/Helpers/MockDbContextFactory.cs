using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using MockQueryable.Moq;
using Moq;

namespace HSTS.Tests.Helpers;

public class MockDbContextFactory
{
    private List<Account> _accounts = new();
    private List<User> _users = new();
    private List<Role> _roles = new();
    private List<Otp> _otps = new();
    private List<Profile> _profiles = new();
    private List<UserRole> _userRoles = new();
    private List<AccountRefreshToken> _refreshTokens = new();

    public static MockDbContextFactory Create() => new();

    public MockDbContextFactory WithAccounts(params Account[] accounts) { _accounts.AddRange(accounts); return this; }
    public MockDbContextFactory WithUsers(params User[] users) { _users.AddRange(users); return this; }
    public MockDbContextFactory WithRoles(params Role[] roles) { _roles.AddRange(roles); return this; }
    public MockDbContextFactory WithOtps(params Otp[] otps) { _otps.AddRange(otps); return this; }
    public MockDbContextFactory WithRefreshTokens(params AccountRefreshToken[] tokens) { _refreshTokens.AddRange(tokens); return this; }

    public Mock<IAppDbContext> Build()
    {
        var mock = new Mock<IAppDbContext>();

        mock.Setup(x => x.Accounts).Returns(_accounts.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Users).Returns(_users.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Roles).Returns(_roles.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Otps).Returns(_otps.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Profiles).Returns(_profiles.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.UserRoles).Returns(_userRoles.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.AccountRefreshTokens).Returns(_refreshTokens.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        return mock;
    }
}
