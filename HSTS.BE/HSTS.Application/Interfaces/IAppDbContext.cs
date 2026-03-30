using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Interfaces
{
    public interface IAppDbContext
    {
        DbSet<Account> Accounts { get; }
        DbSet<User> Users { get; }
        DbSet<Profile> Profiles { get; }
        DbSet<Role> Roles { get; }
        DbSet<UserRole> UserRoles { get; }
        DbSet<Otp> Otps { get; }
        DbSet<AccountRefreshToken> AccountRefreshTokens { get; }
        DbSet<TransportMode> TransportModes { get; }
        DbSet<LocalTransportMetrics> LocalTransportMetrics { get; }
        DbSet<TransitHubType> TransitHubTypes { get; }
        DbSet<TransitHubs> TransitHubs { get; }
        DbSet<Province> Provinces { get; }
        DbSet<District> Districts { get; }
        DbSet<Country> Countries { get; }
        DbSet<LocationType> LocationTypes { get; }
        DbSet<Location> Locations { get; }
        DbSet<Tag> Tags { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
