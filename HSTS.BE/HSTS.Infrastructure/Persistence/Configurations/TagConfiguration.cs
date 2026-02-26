using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TagConfiguration : IEntityTypeConfiguration<Tag>
    {
        public void Configure(EntityTypeBuilder<Tag> builder)
        {
            builder.ToTable("Tags");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                   .ValueGeneratedOnAdd();

            builder.Property(x => x.Name)
                   .HasMaxLength(100)
                   .IsRequired();

            // Unique tag name
            builder.HasIndex(x => x.Name)
                   .IsUnique(true);

            // Relationship many-to-many via LocationTag
            builder.HasMany(x => x.LocationTags)
                   .WithOne(x => x.Tag)
                   .HasForeignKey(x => x.TagId)
                   .OnDelete(DeleteBehavior.Cascade);

            // Charset MySQL
            builder.HasCharSet("utf8mb4");
            builder.UseCollation("utf8mb4_unicode_ci");
        }
    }
}