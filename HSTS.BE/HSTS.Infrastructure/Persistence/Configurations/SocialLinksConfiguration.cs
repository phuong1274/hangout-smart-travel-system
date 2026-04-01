namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class SocialLinksConfiguration : IEntityTypeConfiguration<SocialLinks>
    {
        public void Configure(EntityTypeBuilder<SocialLinks> builder)
        {
            builder.ToTable("SocialLinks");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Platform)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Url)
                .HasMaxLength(1000)
                .IsRequired();

            builder.HasOne(x => x.Location)
                .WithMany(x => x.SocialLinks)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => new { x.LocationId, x.Platform });
        }
    }
}