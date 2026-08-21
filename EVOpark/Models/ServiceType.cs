namespace EVOpark.Models;

public sealed class ServiceType
{
    public byte ServiceTypeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public short DefaultDurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string PricingUnit { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
