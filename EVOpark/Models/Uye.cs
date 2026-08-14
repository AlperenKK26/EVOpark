namespace EVOpark.Models
{
    public sealed class Uye
    {
        public int MemberId { get; set; }

        public string FirstName { get; set; } = "";

        public string LastName { get; set; } = "";

        public int Age { get; set; }

        public string NationalId { get; set; } = "";

        public string PhoneNumber { get; set; } = "";

        public string Email { get; set; } = "";

        public string PasswordHash { get; set; } = "";

        public string Address { get; set; } = "";

        public DateTime RegistrationDate { get; set; }

        public bool Status { get; set; }
    }
}
