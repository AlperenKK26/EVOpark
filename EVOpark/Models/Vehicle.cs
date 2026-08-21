namespace EVOpark.Models;

public sealed class Vehicle
{
    public int VehicleId { get; set; }
    public int MemberId { get; set; }
    public string Plate { get; set; } = string.Empty;
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string? Color { get; set; }
    public bool IsElectric { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
