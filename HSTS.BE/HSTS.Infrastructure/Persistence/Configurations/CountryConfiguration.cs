namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class CountryConfiguration : IEntityTypeConfiguration<Country>
    {
        public void Configure(EntityTypeBuilder<Country> builder)
        {
            builder.ToTable("Countries");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(120)
                .IsRequired();

            builder.HasIndex(x => x.Name).IsUnique();
        }
    }
}