using HSTS.Domain.Enums;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class AccountConfiguration : IEntityTypeConfiguration<Account>
    {
        public void Configure(EntityTypeBuilder<Account> builder)
        {
            builder.ToTable("Accounts");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Email).HasMaxLength(150).IsRequired();
            builder.HasIndex(x => x.Email).IsUnique();
            builder.Property(x => x.PasswordHash).HasMaxLength(255);
            builder.Property(x => x.GoogleId).HasMaxLength(255);
            builder.HasIndex(x => x.GoogleId).IsUnique().HasFilter("GoogleId IS NOT NULL");
            builder.Property(x => x.Status)
                .HasConversion<int>()
                .HasDefaultValue(AccountStatus.PendingVerification);

            builder.HasOne(x => x.User)
                .WithOne(x => x.Account)
                .HasForeignKey<User>(x => x.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(x => x.RefreshTokens)
                .WithOne(x => x.Account)
                .HasForeignKey(x => x.AccountId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
