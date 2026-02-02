namespace HSTS.Infrastructure.Persistence.Configurations
{
    public class LogErrorConfiguration : IEntityTypeConfiguration<LogError>
    {
        public void Configure(EntityTypeBuilder<LogError> builder)
        {
            builder.ToTable("LogError");
            builder.HasKey(l => l.Id);
            builder.Property(l => l.Id).ValueGeneratedOnAdd();

            builder.Property(l => l.LogContent).IsRequired();
            builder.Property(l => l.PositionError);
            builder.Property(l => l.CreatedAt).IsRequired();
            builder.Property(l => l.ObjectGuid);
            builder.Property(l => l.UserId);
        }
    }
}
