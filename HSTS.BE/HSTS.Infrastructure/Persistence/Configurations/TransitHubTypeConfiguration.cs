namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TransitHubTypeConfiguration : IEntityTypeConfiguration<TransitHubType>
    {
        public void Configure(EntityTypeBuilder<TransitHubType> builder)
        {
            builder.ToTable("TransitHubTypes");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(100)
                .IsRequired();

            builder.HasMany(x => x.TransitHubs)
                .WithOne(x => x.TransitHubType)
                .HasForeignKey(x => x.TransitHubTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
