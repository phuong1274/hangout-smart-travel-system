
namespace HSTS.Infrastructure.Persistence.Configurations
{
    public class LogLoginConfiguration : IEntityTypeConfiguration<LogLogin>
    {
        public void Configure(EntityTypeBuilder<LogLogin> builder)
        {
            builder.ToTable("LogLogin");
            builder.HasKey(l => l.Id);
            builder.Property(l => l.Id).ValueGeneratedOnAdd();

            builder.Property(l => l.LoginAt).IsRequired();
            builder.Property(l => l.LogoutAt);
            builder.Property(l => l.UserId);
        }
    }
}
