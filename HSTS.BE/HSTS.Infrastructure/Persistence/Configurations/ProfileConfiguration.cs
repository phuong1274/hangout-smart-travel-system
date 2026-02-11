namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class ProfileConfiguration : IEntityTypeConfiguration<Profile>
    {
        public void Configure(EntityTypeBuilder<Profile> builder)
        {
            builder.ToTable("Profiles");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.ProfileName).HasMaxLength(100).IsRequired();
            builder.Property(x => x.Address).HasMaxLength(500);
            builder.Property(x => x.AvatarUrl).HasMaxLength(500);

            builder.HasOne(x => x.User)
                .WithMany(x => x.Profiles)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
