namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class TransitHubsConfiguration : IEntityTypeConfiguration<TransitHubs>
    {
        public void Configure(EntityTypeBuilder<TransitHubs> builder)
        {
            builder.ToTable("TransitHubs");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Code)
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.HasIndex(x => x.Code)
                .IsUnique();

            builder.HasOne(x => x.Province)
                .WithMany(x => x.TransitHubs)
                .HasForeignKey(x => x.ProvinceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.District)
                .WithMany(x => x.TransitHubs)
                .HasForeignKey(x => x.DistrictId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
