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

        DbSet<Tag> Tags { get; }
        DbSet<Country> Countries { get; }
        DbSet<Province> Provinces { get; }
        DbSet<District> Districts { get; }
        DbSet<Location> Locations { get; }
        DbSet<LocationTag> LocationTags { get; }
        DbSet<RoomType> RoomTypes { get; }
        DbSet<TransportMode> TransportModes { get; }
        DbSet<TransportModePricing> TransportModePricings { get; }
        DbSet<TransitHubType> TransitHubTypes { get; }
        DbSet<TransitHub> TransitHubs { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
