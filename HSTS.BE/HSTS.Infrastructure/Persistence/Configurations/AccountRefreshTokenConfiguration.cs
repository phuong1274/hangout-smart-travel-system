namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class AccountRefreshTokenConfiguration : IEntityTypeConfiguration<AccountRefreshToken>
    {
        public void Configure(EntityTypeBuilder<AccountRefreshToken> builder)
        {
            builder.ToTable("AccountRefreshTokens");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Token).HasMaxLength(500).IsRequired();
            builder.HasIndex(x => x.Token).IsUnique();
            builder.Property(x => x.ExpiredAt).IsRequired();
            builder.Property(x => x.CreatedAt)
                .HasColumnType("timestamp")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        }
    }
}
