namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TagConfiguration : IEntityTypeConfiguration<Tag>
    {
        public void Configure(EntityTypeBuilder<Tag> builder)
        {
            builder.ToTable("Tags");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Title)
                .HasMaxLength(150)
                .IsRequired();

            builder.HasIndex(x => x.Title);
            builder.HasIndex(x => x.TagParentId);

            builder.HasOne(x => x.ParentTag)
                .WithMany(x => x.ChildTags)
                .HasForeignKey(x => x.TagParentId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}