using System.Data;
using System.Globalization;
using System.Security.Claims;
using EVOpark.Data;
using EVOpark.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EVOpark.Controllers;

[Authorize]
[ApiController]
[Route("api/bookings")]
public sealed class BookingController : ControllerBase
{
    private static readonly string[] BlockingStatuses = ["PENDING", "CONFIRMED"];
    private static readonly HashSet<string> AllowedServiceCodes =
        new(["PARKING", "WASH", "CHARGE"], StringComparer.Ordinal);

    private readonly AppDbContext _db;
    private readonly ILogger<BookingController> _logger;

    public BookingController(AppDbContext db, ILogger<BookingController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet("availability")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Availability(
        [FromQuery] int facilityId,
        [FromQuery] string serviceCode,
        [FromQuery] string? startAt,
        CancellationToken cancellationToken)
    {
        string normalizedServiceCode = serviceCode.Trim().ToUpperInvariant();
        if (!AllowedServiceCodes.Contains(normalizedServiceCode))
        {
            return BadRequest(new { message = "Geçersiz hizmet türü." });
        }

        DateTime requestedStart;
        if (string.IsNullOrWhiteSpace(startAt))
        {
            requestedStart = DateTime.Now;
        }
        else if (!DateTime.TryParseExact(
                     startAt,
                     ["yyyy-MM-ddTHH:mm", "yyyy-MM-ddTHH:mm:ss"],
                     CultureInfo.InvariantCulture,
                     DateTimeStyles.None,
                     out requestedStart))
        {
            return BadRequest(new { message = "Tarih veya saat biçimi geçersiz." });
        }

        var service = await (
            from serviceResource in _db.ServiceResources.AsNoTracking()
            join serviceType in _db.ServiceTypes.AsNoTracking()
                on serviceResource.ServiceTypeId equals serviceType.ServiceTypeId
            join facility in _db.Facilities.AsNoTracking()
                on serviceResource.FacilityId equals facility.FacilityId
            where serviceType.Code == normalizedServiceCode &&
                  serviceType.IsActive &&
                  serviceResource.IsActive &&
                  facility.IsActive &&
                  (facilityId <= 0 || facility.FacilityId == facilityId)
            orderby facility.FacilityId, serviceResource.DisplayOrder
            select new
            {
                facility.FacilityId,
                FacilityName = facility.Name,
                FacilityAddress = facility.Address,
                serviceType.ServiceTypeId,
                ServiceName = serviceType.Name,
                serviceType.DefaultDurationMinutes,
                serviceType.Price,
                serviceType.PricingUnit
            }).FirstOrDefaultAsync(cancellationToken);

        if (service is null)
        {
            return NotFound(new
            {
                message = "Bu hizmete ait aktif tesis veya alan bulunamadı."
            });
        }

        facilityId = service.FacilityId;

        DateTime requestedEnd = requestedStart.AddMinutes(service.DefaultDurationMinutes);

        var resources = await _db.ServiceResources.AsNoTracking()
            .Where(resource =>
                resource.FacilityId == facilityId &&
                resource.ServiceTypeId == service.ServiceTypeId &&
                resource.IsActive)
            .OrderBy(resource => resource.DisplayOrder)
            .Select(resource => new
            {
                resource.ResourceId,
                resource.Code,
                resource.BlockCode,
                resource.DisplayOrder
            })
            .ToListAsync(cancellationToken);

        int[] resourceIds = resources.Select(resource => resource.ResourceId).ToArray();

        var liveStatuses = await _db.ResourceLiveStatuses.AsNoTracking()
            .Where(status => resourceIds.Contains(status.ResourceId))
            .Select(status => new
            {
                status.ResourceId,
                status.PhysicalStatus,
                status.UpdatedAt
            })
            .ToDictionaryAsync(status => status.ResourceId, cancellationToken);

        HashSet<int> reservedResourceIds = (
            await _db.Reservations.AsNoTracking()
                .Where(reservation =>
                    resourceIds.Contains(reservation.ResourceId) &&
                    BlockingStatuses.Contains(reservation.Status) &&
                    reservation.StartAt < requestedEnd &&
                    reservation.EndAt > requestedStart &&
                    (reservation.Status != "PENDING" ||
                     reservation.HoldExpiresAt == null ||
                     reservation.HoldExpiresAt > DateTime.Now))
                .Select(reservation => reservation.ResourceId)
                .Distinct()
                .ToListAsync(cancellationToken))
            .ToHashSet();

        DateTime now = DateTime.Now;
        bool windowContainsNow = requestedStart <= now && requestedEnd > now;

        var responseResources = resources.Select(resource =>
        {
            liveStatuses.TryGetValue(resource.ResourceId, out var liveStatus);
            string physicalStatus = liveStatus?.PhysicalStatus?.Trim().ToUpperInvariant() ?? "FREE";

            string status = physicalStatus switch
            {
                "MAINTENANCE" => "MAINTENANCE",
                "OFFLINE" => "OFFLINE",
                _ when reservedResourceIds.Contains(resource.ResourceId) => "RESERVED",
                "OCCUPIED" when windowContainsNow => "OCCUPIED",
                _ => "FREE"
            };

            return new
            {
                resource.ResourceId,
                resource.Code,
                resource.BlockCode,
                resource.DisplayOrder,
                Status = status,
                StatusUpdatedAt = liveStatus?.UpdatedAt
            };
        }).ToArray();

        return Ok(new
        {
            service.FacilityId,
            service.FacilityName,
            service.FacilityAddress,
            ServiceCode = normalizedServiceCode,
            service.ServiceName,
            service.DefaultDurationMinutes,
            service.Price,
            service.PricingUnit,
            RequestedStart = requestedStart,
            RequestedEnd = requestedEnd,
            AvailableCount = responseResources.Count(resource => resource.Status == "FREE"),
            Resources = responseResources
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateBookingRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsSameOriginRequest())
        {
            return BadRequest(new { message = "Geçersiz istek kaynağı." });
        }

        if (!TryGetMemberId(out int memberId))
        {
            return Unauthorized(new { message = "Oturum bilgisi geçersiz." });
        }

        if (request.ResourceId <= 0)
        {
            return BadRequest(new { message = "Geçerli bir alan seçin." });
        }

        DateTime startAt = DateTime.SpecifyKind(request.StartAt, DateTimeKind.Unspecified);
        DateTime now = DateTime.Now;
        if (startAt < now.AddMinutes(-1) || startAt > now.AddDays(90))
        {
            return BadRequest(new
            {
                message = "Randevu zamanı geçmişte veya 90 günden daha ileride olamaz."
            });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        try
        {
            var resource = await (
                from serviceResource in _db.ServiceResources
                join serviceType in _db.ServiceTypes
                    on serviceResource.ServiceTypeId equals serviceType.ServiceTypeId
                join facility in _db.Facilities
                    on serviceResource.FacilityId equals facility.FacilityId
                where serviceResource.ResourceId == request.ResourceId &&
                      serviceResource.IsActive &&
                      serviceType.IsActive &&
                      facility.IsActive
                select new
                {
                    serviceResource.ResourceId,
                    serviceResource.Code,
                    serviceType.DefaultDurationMinutes,
                    serviceType.Price,
                    serviceType.PricingUnit
                }).SingleOrDefaultAsync(cancellationToken);

            if (resource is null)
            {
                return NotFound(new { message = "Seçilen alan kullanılamıyor." });
            }

            DateTime endAt = startAt.AddMinutes(resource.DefaultDurationMinutes);

            string? physicalStatus = await _db.ResourceLiveStatuses
                .Where(status => status.ResourceId == resource.ResourceId)
                .Select(status => status.PhysicalStatus)
                .SingleOrDefaultAsync(cancellationToken);

            string normalizedPhysicalStatus =
                physicalStatus?.Trim().ToUpperInvariant() ?? "FREE";

            bool windowContainsNow = startAt <= now && endAt > now;
            if (normalizedPhysicalStatus is "MAINTENANCE" or "OFFLINE" ||
                (normalizedPhysicalStatus == "OCCUPIED" && windowContainsNow))
            {
                return Conflict(new
                {
                    message = "Seçilen alan şu anda kullanılamıyor. Doluluk listesini yenileyin."
                });
            }

            bool hasConflict = await _db.Reservations.AnyAsync(
                reservation =>
                    reservation.ResourceId == resource.ResourceId &&
                    BlockingStatuses.Contains(reservation.Status) &&
                    reservation.StartAt < endAt &&
                    reservation.EndAt > startAt &&
                    (reservation.Status != "PENDING" ||
                     reservation.HoldExpiresAt == null ||
                     reservation.HoldExpiresAt > now),
                cancellationToken);

            if (hasConflict)
            {
                return Conflict(new
                {
                    message = "Bu alan seçilen saatte başka bir kullanıcı tarafından rezerve edildi."
                });
            }

            if (request.VehicleId is int vehicleId)
            {
                bool ownsVehicle = await _db.Vehicles.AnyAsync(
                    vehicle => vehicle.VehicleId == vehicleId &&
                               vehicle.MemberId == memberId &&
                               vehicle.IsActive,
                    cancellationToken);

                if (!ownsVehicle)
                {
                    return BadRequest(new { message = "Araç bilgisi geçersiz." });
                }
            }

            decimal totalPrice = resource.PricingUnit.ToUpperInvariant() == "HOUR"
                ? decimal.Round(
                    resource.Price * resource.DefaultDurationMinutes / 60m,
                    2,
                    MidpointRounding.AwayFromZero)
                : resource.Price;

            var reservation = new Reservation
            {
                MemberId = memberId,
                VehicleId = request.VehicleId,
                ResourceId = resource.ResourceId,
                StartAt = startAt,
                EndAt = endAt,
                Status = "CONFIRMED",
                UnitPrice = resource.Price,
                TotalPrice = totalPrice,
                CreatedAt = now
            };

            _db.Reservations.Add(reservation);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return StatusCode(StatusCodes.Status201Created, new
            {
                reservation.ReservationId,
                ResourceCode = resource.Code,
                reservation.StartAt,
                reservation.EndAt,
                reservation.Status,
                reservation.TotalPrice,
                message = "Randevunuz başarıyla oluşturuldu."
            });
        }
        catch (DbUpdateException exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(exception, "Randevu kaydedilirken veritabanı hatası oluştu.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Randevu kaydedilemedi. Lütfen tekrar deneyin."
            });
        }
    }

    private bool TryGetMemberId(out int memberId)
    {
        string? value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out memberId) && memberId > 0;
    }

    private bool IsSameOriginRequest()
    {
        string? origin = Request.Headers.Origin.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(origin) ||
            !Uri.TryCreate(origin, UriKind.Absolute, out Uri? originUri))
        {
            return false;
        }

        return string.Equals(originUri.Scheme, Request.Scheme, StringComparison.OrdinalIgnoreCase) &&
               string.Equals(originUri.Authority, Request.Host.Value, StringComparison.OrdinalIgnoreCase);
    }

    public sealed class CreateBookingRequest
    {
        public int ResourceId { get; set; }
        public int? VehicleId { get; set; }
        public DateTime StartAt { get; set; }
    }
}
