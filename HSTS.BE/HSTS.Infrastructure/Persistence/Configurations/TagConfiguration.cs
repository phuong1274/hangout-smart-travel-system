using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TagConfiguration : IEntityTypeConfiguration<Tag>
    {
        public void Configure(EntityTypeBuilder<Tag> builder)
        {
            builder.ToTable("Tags");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(100)
                .IsRequired();

            // Hierarchical tag configuration
            builder.Property(x => x.Level)
                .HasDefaultValue(1);

            builder.HasOne(x => x.ParentTag)
                .WithMany(x => x.ChildTags)
                .HasForeignKey(x => x.ParentTagId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascade delete cycles
        }
    }
}
