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
    private List<PasswordSetupToken> _passwordSetupTokens = new();
    private List<Profile> _profiles = new();
    private List<UserRole> _userRoles = new();
    private List<AccountRefreshToken> _refreshTokens = new();
    private List<Province> _provinces = new();
    private List<District> _districts = new();
    private List<Location> _locations = new();
    private List<LocationReview> _locationReviews = new();
    private List<LocationReviewReport> _locationReviewReports = new();
    private List<Trip> _trips = new();

    public static MockDbContextFactory Create() => new();

    public MockDbContextFactory WithAccounts(params Account[] accounts) { _accounts.AddRange(accounts); return this; }
    public MockDbContextFactory WithUsers(params User[] users) { _users.AddRange(users); return this; }
    public MockDbContextFactory WithRoles(params Role[] roles) { _roles.AddRange(roles); return this; }
    public MockDbContextFactory WithOtps(params Otp[] otps) { _otps.AddRange(otps); return this; }
    public MockDbContextFactory WithPasswordSetupTokens(params PasswordSetupToken[] tokens) { _passwordSetupTokens.AddRange(tokens); return this; }
    public MockDbContextFactory WithRefreshTokens(params AccountRefreshToken[] tokens) { _refreshTokens.AddRange(tokens); return this; }
    public MockDbContextFactory WithProfiles(params Profile[] profiles) { _profiles.AddRange(profiles); return this; }
    public MockDbContextFactory WithUserRoles(params UserRole[] userRoles) { _userRoles.AddRange(userRoles); return this; }
    public MockDbContextFactory WithProvinces(params Province[] provinces) { _provinces.AddRange(provinces); return this; }
    public MockDbContextFactory WithDistricts(params District[] districts) { _districts.AddRange(districts); return this; }
    public MockDbContextFactory WithLocations(params Location[] locations) { _locations.AddRange(locations); return this; }
    public MockDbContextFactory WithLocationReviews(params LocationReview[] reviews) { _locationReviews.AddRange(reviews); return this; }
    public MockDbContextFactory WithLocationReviewReports(params LocationReviewReport[] reports) { _locationReviewReports.AddRange(reports); return this; }
    public MockDbContextFactory WithTrips(params Trip[] trips) { _trips.AddRange(trips); return this; }

    public Mock<IAppDbContext> Build()
    {
        var mock = new Mock<IAppDbContext>();

        mock.Setup(x => x.Accounts).Returns(_accounts.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Users).Returns(_users.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Roles).Returns(_roles.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Otps).Returns(_otps.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.PasswordSetupTokens).Returns(_passwordSetupTokens.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Profiles).Returns(_profiles.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.UserRoles).Returns(_userRoles.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.AccountRefreshTokens).Returns(_refreshTokens.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Provinces).Returns(_provinces.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Districts).Returns(_districts.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Locations).Returns(_locations.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.LocationReviews).Returns(_locationReviews.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.LocationReviewReports).Returns(_locationReviewReports.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.Trips).Returns(_trips.AsQueryable().BuildMockDbSet().Object);
        mock.Setup(x => x.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        return mock;
    }
}
