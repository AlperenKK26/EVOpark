namespace EVOpark.Models;

public sealed class ServiceResource
{
    public int ResourceId { get; set; }
    public int FacilityId { get; set; }
    public byte ServiceTypeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? BlockCode { get; set; }
    public short DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
