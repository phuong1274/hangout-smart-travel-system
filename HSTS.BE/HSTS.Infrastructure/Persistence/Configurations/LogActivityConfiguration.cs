
namespace HSTS.Infrastructure.Persistence.Configurations
{
    public class LogActivityConfiguration : IEntityTypeConfiguration<LogActivity>
    {
        public void Configure(EntityTypeBuilder<LogActivity> builder)
        {
            builder.ToTable("LogActivity");
            builder.HasKey(l => l.Id);
            builder.Property(l => l.Id).ValueGeneratedOnAdd();

            builder.Property(l => l.LogContent);
            builder.Property(l => l.CreatedAt).IsRequired();
            builder.Property(l => l.ObjectGuid);
            builder.Property(l => l.UserId);
        }
    }
}
