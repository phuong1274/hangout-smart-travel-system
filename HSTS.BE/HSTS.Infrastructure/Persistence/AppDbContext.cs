using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Infrastructure.Persistence
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Location> Locations => Set<Location>();
        public DbSet<LocationMedia> LocationMedias => Set<LocationMedia>();
        public DbSet<LocationTag> LocationTags => Set<LocationTag>();
        public DbSet<Tag> Tags => Set<Tag>();
        public DbSet<LocationType> LocationTypes => Set<LocationType>();
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
                        .HasColumnType("datetime")
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");

                    modelBuilder.Entity(entityType.ClrType)
                        .Property(nameof(BaseEntity.UpdatedAt))
                        .HasColumnType("datetime")
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
