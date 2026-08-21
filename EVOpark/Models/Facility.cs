namespace EVOpark.Models;

public sealed class Facility
{
    public int FacilityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public TimeSpan? OpenTime { get; set; }
    public TimeSpan? CloseTime { get; set; }
    public bool Is24Hours { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
