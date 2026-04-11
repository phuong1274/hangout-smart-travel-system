namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class PasswordSetupTokenConfiguration : IEntityTypeConfiguration<PasswordSetupToken>
    {
        public void Configure(EntityTypeBuilder<PasswordSetupToken> builder)
        {
            builder.ToTable("PasswordSetupTokens");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Token).HasMaxLength(128).IsRequired();
            builder.HasIndex(x => x.Token).IsUnique();
            builder.Property(x => x.ExpiredAt).IsRequired();
            builder.Property(x => x.IsUsed).HasDefaultValue(false);

            builder.HasOne(x => x.Account)
                .WithMany()
                .HasForeignKey(x => x.AccountId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
