namespace EVOpark.Controllers
{
    using System.Security.Claims;
    using global::EVOpark.Data;
    using global::EVOpark.Models;
    using Microsoft.AspNetCore.Authentication;
    using Microsoft.AspNetCore.Authentication.Cookies;
    using Microsoft.AspNetCore.Identity;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.EntityFrameworkCore;

    namespace EVOpark.Controllers
    {
        [ApiController]
        [Route("api/auth")]
        public sealed class AuthController : ControllerBase
        {
            private readonly AppDbContext _db;

            public AuthController(AppDbContext db)
            {
                _db = db;
            }

            [HttpPost("login")]
            public async Task<IActionResult> Login(
                [FromBody] LoginRequest request)
            {
                if (string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new
                    {
                        message = "E-posta ve şifre zorunludur."
                    });
                }

                string email = request.Email
                    .Trim()
                    .ToLower();

                Uye? uye = await _db.Uyeler
                    .AsNoTracking()
                    .SingleOrDefaultAsync(x =>
                        x.Email.ToLower() == email);

                // Status bool olduğu için !uye.Status kullanıyoruz.
                if (uye is null || !uye.Status)
                {
                    return Unauthorized(new
                    {
                        message = "E-posta veya şifre hatalı."
                    });
                }

                var passwordHasher = new PasswordHasher<Uye>();

                PasswordVerificationResult verificationResult =
                    passwordHasher.VerifyHashedPassword(
                        uye,
                        uye.PasswordHash,
                        request.Password);

                if (verificationResult ==
                    PasswordVerificationResult.Failed)
                {
                    return Unauthorized(new
                    {
                        message = "E-posta veya şifre hatalı."
                    });
                }

                var claims = new List<Claim>
            {
                new Claim(
                    ClaimTypes.NameIdentifier,
                    uye.MemberId.ToString()),

                new Claim(
                    ClaimTypes.Name,
                    uye.FirstName),

                new Claim(
                    ClaimTypes.Email,
                    uye.Email)
            };

                var identity = new ClaimsIdentity(
                    claims,
                    CookieAuthenticationDefaults.AuthenticationScheme);

                var principal = new ClaimsPrincipal(identity);

                await HttpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    principal,
                    new AuthenticationProperties
                    {
                        IsPersistent = true,
                        ExpiresUtc =
                            DateTimeOffset.UtcNow.AddHours(8)
                    });

                return Ok(new
                {
                    message = "Giriş başarılı.",
                    redirectUrl = "/home.html"
                });
            }

            [HttpGet("me")]
            public IActionResult CurrentUser()
            {
                if (User.Identity?.IsAuthenticated != true)
                {
                    return Unauthorized(new
                    {
                        message = "Giriş yapılmamış."
                    });
                }

                return Ok(new
                {
                    memberId = User.FindFirstValue(
                        ClaimTypes.NameIdentifier),

                    firstName = User.FindFirstValue(
                        ClaimTypes.Name),

                    email = User.FindFirstValue(
                        ClaimTypes.Email)
                });
            }
            #if DEBUG


            [HttpPost("logout")]
            public async Task<IActionResult> Logout()
            {
                await HttpContext.SignOutAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme);

                return Ok(new
                {
                    message = "Çıkış yapıldı."
                });
            }

        }
    }
}
#endif