namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("Users");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.FullName).HasMaxLength(100).IsRequired();
            builder.Property(x => x.Email).HasMaxLength(150).IsRequired();
        }
    }
}
