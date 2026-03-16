using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HSTS.Domain.Entities;

namespace HSTS.Infrastructure.Persistence.Configurations
{
    internal class StateConfiguration : IEntityTypeConfiguration<State>
    {
        public void Configure(EntityTypeBuilder<State> builder)
        {
            builder.ToTable("States");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Code)
                .HasMaxLength(50);

            builder.Property(x => x.CountryId)
                .HasMaxLength(50)
                .IsRequired();

            builder.HasOne(s => s.Country)
                .WithMany(c => c.States)
                .HasForeignKey(s => s.CountryId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(s => s.Destinations)
                .WithOne(d => d.State)
                .HasForeignKey(d => d.StateId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
