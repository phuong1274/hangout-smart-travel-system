using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Infrastructure.Persistence
{
    public class AppDbContext : DbContext, IAppDbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Account> Accounts => Set<Account>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Profile> Profiles => Set<Profile>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<UserRole> UserRoles => Set<UserRole>();
        public DbSet<Otp> Otps => Set<Otp>();
        public DbSet<AccountRefreshToken> AccountRefreshTokens => Set<AccountRefreshToken>();
        public DbSet<TransportMode> TransportModes => Set<TransportMode>();
        public DbSet<LocalTransportMetrics> LocalTransportMetrics => Set<LocalTransportMetrics>();
        public DbSet<TransitHubType> TransitHubTypes => Set<TransitHubType>();
        public DbSet<TransitHubs> TransitHubs => Set<TransitHubs>();
        public DbSet<Province> Provinces => Set<Province>();
        public DbSet<District> Districts => Set<District>();
        public DbSet<Country> Countries => Set<Country>();
        public DbSet<LocationType> LocationTypes => Set<LocationType>();
        public DbSet<Location> Locations => Set<Location>();
        public DbSet<Amenities> Amenities => Set<Amenities>();
        public DbSet<OpeningHours> OpeningHours => Set<OpeningHours>();
        public DbSet<SocialLinks> SocialLinks => Set<SocialLinks>();
        public DbSet<LocationMedia> LocationMedias => Set<LocationMedia>();
        public DbSet<Tag> Tags => Set<Tag>();
        public DbSet<LocationClosure> LocationClosures => Set<LocationClosure>();

        #region Logging
        /// <summary>
        /// Logging config
        /// !!!WARNING, DO NOT DELETE THIS SECTION!!!
        /// If you delete this section, the logging feature will be broken.
        /// </summary>
        public DbSet<LogError> LogErrors => Set<LogError>();
        public DbSet<LogActivity> LogActivities => Set<LogActivity>();
        public DbSet<LogHistory> LogHistories => Set<LogHistory>();
        public DbSet<LogLogin> LogLogins => Set<LogLogin>();
        #endregion

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
                {
                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(BaseEntity.CreatedAt))
                        .HasColumnType("timestamp")
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");

                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(BaseEntity.UpdatedAt))
                        .HasColumnType("timestamp")
                        .HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                        .ValueGeneratedOnAddOrUpdate();

                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(BaseEntity.IsDeleted))
                        .HasDefaultValue(false);
                }
            }
        }
    }
}
