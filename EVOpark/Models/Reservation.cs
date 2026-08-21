namespace EVOpark.Models;

public sealed class Reservation
{
    public long ReservationId { get; set; }
    public int MemberId { get; set; }
    public int? VehicleId { get; set; }
    public int ResourceId { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public string Status { get; set; } = "CONFIRMED";
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public DateTime? HoldExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? Note { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
