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
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
