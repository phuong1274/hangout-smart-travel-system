namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class RoleConfiguration : IEntityTypeConfiguration<Role>
    {
        public void Configure(EntityTypeBuilder<Role> builder)
        {
            builder.ToTable("Roles");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Name).HasMaxLength(50).IsRequired();
            builder.HasIndex(x => x.Name).IsUnique();
            builder.Property(x => x.IsActive).HasDefaultValue(true);

            builder.HasData(
                new Role { Id = 1, Name = "ADMIN", IsActive = true },
                new Role { Id = 2, Name = "CONTENT_MODERATOR", IsActive = true },
                new Role { Id = 3, Name = "PARTNER", IsActive = true },
                new Role { Id = 4, Name = "TRAVELER", IsActive = true }
            );
        }
    }
}
