namespace EVOpark.Models;

public sealed class Uye
{
    public int MemberId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string NationalId { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public DateTime? BirthDate { get; set; }
    public bool Status { get; set; }
    public string Role { get; set; } = "User";
}
