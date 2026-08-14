using EVOpark.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Controller kullanýmýný etkinleþtirir.
builder.Services.AddControllers();

// appsettings.json içindeki SQL Server baðlantýsýný kullanýr.
builder.Services.AddDbContext<AppDbContext>(options =>
{
    string connectionString =
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException(
            "DefaultConnection baðlantý bilgisi bulunamadý.");

    options.UseSqlServer(connectionString);
});

// Cookie tabanlý oturum sistemini etkinleþtirir.
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "EVOpark.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.Cookie.SameSite = SameSiteMode.Lax;

        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;

        options.LoginPath = "/login.html";

        // API çaðrýsýnda giriþ yapýlmamýþsa 401 döndürür.
        options.Events.OnRedirectToLogin = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.StatusCode =
                    StatusCodes.Status401Unauthorized;

                return Task.CompletedTask;
            }

            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseHttpsRedirection();

// wwwroot içindeki HTML, CSS ve JS dosyalarýný yayýnlar.
app.UseDefaultFiles();
app.UseStaticFiles();

// Sýralarý önemli.
app.UseAuthentication();
app.UseAuthorization();

// Controllers klasöründeki API endpoint’lerini açar.
app.MapControllers();

app.Run();