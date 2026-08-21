namespace EVOpark.Models;

public sealed class ResourceLiveStatus
{
    public int ResourceId { get; set; }
    public string PhysicalStatus { get; set; } = "FREE";
    public string StatusSource { get; set; } = "SYSTEM";
    public DateTime UpdatedAt { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
