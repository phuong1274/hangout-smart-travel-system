public class LogHistoryConfiguration : IEntityTypeConfiguration<LogHistory>
{
    public void Configure(EntityTypeBuilder<LogHistory> builder)
    {
        builder.ToTable("LogHistory");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).ValueGeneratedOnAdd();

        builder.Property(l => l.LogContent);
        builder.Property(l => l.UpdateAt).IsRequired();
        builder.Property(l => l.ObjectGuid);
        builder.Property(l => l.UserId);
    }
}