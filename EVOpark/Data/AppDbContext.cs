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
    public DbSet<Facility> Facilities => Set<Facility>();
    public DbSet<ServiceType> ServiceTypes => Set<ServiceType>();
    public DbSet<ServiceResource> ServiceResources => Set<ServiceResource>();
    public DbSet<ResourceLiveStatus> ResourceLiveStatuses => Set<ResourceLiveStatus>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Reservation> Reservations => Set<Reservation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Uye>(entity =>
        {
            entity.ToTable("UYE", "dbo");
            entity.HasKey(x => x.MemberId);
            entity.Property(x => x.MemberId)
                .HasColumnName("MemberId")
                .ValueGeneratedOnAdd();
            entity.Property(x => x.FirstName).HasColumnName("FirstName");
            entity.Property(x => x.LastName).HasColumnName("LastName");
            entity.Property(x => x.Age).HasColumnName("Age");
            entity.Property(x => x.NationalId).HasColumnName("NationalId");
            entity.Property(x => x.PhoneNumber).HasColumnName("PhoneNumber");
            entity.Property(x => x.Email).HasColumnName("Email");
            entity.Property(x => x.PasswordHash).HasColumnName("PasswordHash");
            entity.Property(x => x.Address).HasColumnName("Address");

            entity.Property(x => x.BirthDate)
                .HasColumnName("BirthDate")
                .HasColumnType("date");

            entity.Property(x => x.Status).HasColumnName("Status");
            entity.Property(x => x.Role).HasColumnName("Role");
        });

        modelBuilder.Entity<Facility>(entity =>
        {
            entity.ToTable("FACILITY", "dbo");
            entity.HasKey(x => x.FacilityId);
            entity.Property(x => x.FacilityId).ValueGeneratedOnAdd();
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.Property(x => x.Address).HasMaxLength(300);
            entity.Property(x => x.Latitude).HasPrecision(9, 6);
            entity.Property(x => x.Longitude).HasPrecision(9, 6);
        });

        modelBuilder.Entity<ServiceType>(entity =>
        {
            entity.ToTable("SERVICE_TYPE", "dbo");
            entity.HasKey(x => x.ServiceTypeId);
            entity.Property(x => x.ServiceTypeId).ValueGeneratedOnAdd();
            entity.Property(x => x.Code).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.Property(x => x.Price).HasPrecision(10, 2);
            entity.Property(x => x.PricingUnit).HasMaxLength(20).IsUnicode(false);
        });

        modelBuilder.Entity<ServiceResource>(entity =>
        {
            entity.ToTable("SERVICE_RESOURCE", "dbo");
            entity.HasKey(x => x.ResourceId);
            entity.Property(x => x.ResourceId).ValueGeneratedOnAdd();
            entity.Property(x => x.Code).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.BlockCode).HasMaxLength(20).IsUnicode(false);
            entity.HasIndex(x => new { x.FacilityId, x.ServiceTypeId, x.Code }).IsUnique();
        });

        modelBuilder.Entity<ResourceLiveStatus>(entity =>
        {
            entity.ToTable("RESOURCE_LIVE_STATUS", "dbo");
            entity.HasKey(x => x.ResourceId);
            entity.Property(x => x.ResourceId).ValueGeneratedNever();
            entity.Property(x => x.PhysicalStatus).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.StatusSource).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.RowVersion).IsRowVersion();
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("VEHICLE", "dbo");
            entity.HasKey(x => x.VehicleId);
            entity.Property(x => x.VehicleId).ValueGeneratedOnAdd();
            entity.Property(x => x.Plate).HasMaxLength(15);
            entity.Property(x => x.Brand).HasMaxLength(50);
            entity.Property(x => x.Model).HasMaxLength(50);
            entity.Property(x => x.Color).HasMaxLength(30);
        });

        modelBuilder.Entity<Reservation>(entity =>
        {
            entity.ToTable("RESERVATION", "dbo");
            entity.HasKey(x => x.ReservationId);
            entity.Property(x => x.ReservationId).ValueGeneratedOnAdd();
            entity.Property(x => x.Status).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.UnitPrice).HasPrecision(10, 2);
            entity.Property(x => x.TotalPrice).HasPrecision(10, 2);
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.Property(x => x.RowVersion).IsRowVersion();
            entity.HasIndex(x => new { x.ResourceId, x.StartAt, x.EndAt, x.Status });
        });
    }
}
