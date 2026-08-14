using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using EVOpark.Data;
using EVOpark.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EVOpark.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db) => _db = db;

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "E-posta ve şifre zorunludur." });
        }

        string email = request.Email.Trim().ToLowerInvariant();
        Uye? uye = await _db.Uyeler.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Email.ToLower() == email);

        if (uye is null || !uye.Status)
        {
            return Unauthorized(new { message = "E-posta veya şifre hatalı." });
        }

        var passwordHasher = new PasswordHasher<Uye>();
        PasswordVerificationResult result = passwordHasher.VerifyHashedPassword(
            uye, uye.PasswordHash, request.Password);

        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "E-posta veya şifre hatalı." });
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, uye.MemberId.ToString()),
            new(ClaimTypes.Name, uye.FirstName),
            new(ClaimTypes.Email, uye.Email)
        };

        var identity = new ClaimsIdentity(
            claims, CookieAuthenticationDefaults.AuthenticationScheme);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)
            });

        return Ok(new { message = "Giriş başarılı.", redirectUrl = "/home.html" });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        int calculatedAge = CalculateAge(request.BirthDate);

        if (request.BirthDate.Date > DateTime.Today)
        {
            return BadRequest(new { message = "Doğum tarihi gelecekte olamaz." });
        }

        if (calculatedAge < 18 || calculatedAge > 120)
        {
            return BadRequest(new
            {
                message = "Kayıt için yaş 18 ile 120 arasında olmalıdır."
            });
        }

        if (request.Age != calculatedAge)
        {
            return BadRequest(new
            {
                message = $"Girilen yaş doğum tarihiyle uyuşmuyor. " +
                          $"Doğum tarihine göre yaş: {calculatedAge}."
            });
        }

        if (!IsValidTurkishIdentityNumber(request.IdentityNumber))
        {
            return BadRequest(new
            {
                message = "Geçerli bir T.C. kimlik numarası girin."
            });
        }

        string email = request.Email.Trim().ToLowerInvariant();
        string nationalId = request.IdentityNumber.Trim();
        string phoneNumber = request.PhoneNumber.Trim();

        if (await _db.Uyeler.AnyAsync(
                x => x.NationalId == nationalId, cancellationToken))
        {
            return Conflict(new
            {
                message = "Bu T.C. kimlik numarası zaten kayıtlı."
            });
        }

        var uye = new Uye
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Age = calculatedAge,
            NationalId = nationalId,
            PhoneNumber = phoneNumber,
            Email = email,
            Address = request.Address.Trim(),
            BirthDate = request.BirthDate.Date,
            Status = true,
            Role = "User"
        };

        var passwordHasher = new PasswordHasher<Uye>();
        uye.PasswordHash = passwordHasher.HashPassword(uye, request.Password);

        _db.Uyeler.Add(uye);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Kayıt veritabanına eklenirken bir hata oluştu."
            });
        }

        return StatusCode(StatusCodes.Status201Created, new
        {
            message = "Kayıt işlemi başarılı. Giriş sayfasına yönlendiriliyorsunuz...",
            redirectUrl = "/login.html?registered=1"
        });
    }

    [HttpGet("me")]
    public IActionResult CurrentUser()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Unauthorized(new { message = "Giriş yapılmamış." });
        }

        return Ok(new
        {
            memberId = User.FindFirstValue(ClaimTypes.NameIdentifier),
            firstName = User.FindFirstValue(ClaimTypes.Name),
            email = User.FindFirstValue(ClaimTypes.Email)
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(
            CookieAuthenticationDefaults.AuthenticationScheme);

        return Ok(new { message = "Çıkış yapıldı." });
    }

    private static int CalculateAge(DateTime birthDate)
    {
        DateTime today = DateTime.Today;
        int age = today.Year - birthDate.Year;

        if (birthDate.Date > today.AddYears(-age))
        {
            age--;
        }

        return age;
    }

    private static bool IsValidTurkishIdentityNumber(string value)
    {
        if (value.Length != 11 || value[0] == '0' ||
            value.Any(character => !char.IsDigit(character)))
        {
            return false;
        }

        int[] digits = value.Select(character => character - '0').ToArray();
        int oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        int evenSum = digits[1] + digits[3] + digits[5] + digits[7];
        int tenthDigit = ((oddSum * 7) - evenSum) % 10;
        int eleventhDigit = digits.Take(10).Sum() % 10;

        return digits[9] == tenthDigit && digits[10] == eleventhDigit;
    }

    public sealed class RegisterRequest
    {
        [Required(ErrorMessage = "İsim zorunludur.")]
        [StringLength(50, MinimumLength = 2)]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Soyisim zorunludur.")]
        [StringLength(50, MinimumLength = 2)]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "T.C. kimlik numarası zorunludur.")]
        [RegularExpression(@"^[1-9][0-9]{10}$")]
        public string IdentityNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = "Telefon numarası zorunludur.")]
        [RegularExpression(@"^05[0-9]{9}$")]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = "E-posta adresi zorunludur.")]
        [EmailAddress]
        [StringLength(254)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Şifre zorunludur.")]
        [MinLength(8)]
        [MaxLength(100)]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Adres zorunludur.")]
        [StringLength(500, MinimumLength = 10)]
        public string Address { get; set; } = string.Empty;

        [Required(ErrorMessage = "Doğum tarihi zorunludur.")]
        public DateTime BirthDate { get; set; }

        [Range(18, 120)]
        public int Age { get; set; }
    }
}
