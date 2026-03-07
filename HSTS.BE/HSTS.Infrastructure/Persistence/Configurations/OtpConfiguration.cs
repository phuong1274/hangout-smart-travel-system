using HSTS.Domain.Enums;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class OtpConfiguration : IEntityTypeConfiguration<Otp>
    {
        public void Configure(EntityTypeBuilder<Otp> builder)
        {
            builder.ToTable("Otps");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Email).HasMaxLength(150).IsRequired();
            builder.HasIndex(x => x.Email);
            builder.Property(x => x.Code).HasMaxLength(6).IsRequired();
            builder.Property(x => x.Type).HasConversion<int>();
            builder.Property(x => x.ExpiredAt).IsRequired();
            builder.Property(x => x.IsUsed).HasDefaultValue(false);
            builder.Property(x => x.CreatedAt)
                .HasColumnType("timestamp")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        }
    }
}
