using EVOpark.Models;
using EVOpark.Models;
using Microsoft.EntityFrameworkCore;

namespace EVOpark.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Uye> Uyeler => Set<Uye>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Uye>(entity =>
        {
            entity.ToTable("UYE", "dbo");

            entity.HasKey(x => x.MemberId);

            entity.Property(x => x.MemberId)
                .HasColumnName("MemberId");

            entity.Property(x => x.FirstName)
                .HasColumnName("FirstName");

            entity.Property(x => x.LastName)
                .HasColumnName("LastName");

            entity.Property(x => x.Age)
                .HasColumnName("Age");

            entity.Property(x => x.NationalId)
                .HasColumnName("NationalId");

            entity.Property(x => x.PhoneNumber)
                .HasColumnName("PhoneNumber");

            entity.Property(x => x.Email)
                .HasColumnName("Email");

            entity.Property(x => x.PasswordHash)
                .HasColumnName("PasswordHash");

            entity.Property(x => x.Address)
                .HasColumnName("Address");

            entity.Property(x => x.RegistrationDate)
                .HasColumnName("RegistrationDate");

            entity.Property(x => x.Status)
                .HasColumnName("Status");
        });
    }
}