using System.Security.Claims;
using System.Text;
using System.Text.Json;
using DailyTracker.Api.Models;
using DailyTracker.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.SectionName));
builder.Services.Configure<UserStoreOptions>(builder.Configuration.GetSection(UserStoreOptions.SectionName));
builder.Services.Configure<SnapshotStoreOptions>(builder.Configuration.GetSection(SnapshotStoreOptions.SectionName));
builder.Services.Configure<HealthRecordStoreOptions>(builder.Configuration.GetSection(HealthRecordStoreOptions.SectionName));
builder.Services.Configure<SymptomRecordStoreOptions>(builder.Configuration.GetSection(SymptomRecordStoreOptions.SectionName));
builder.Services.Configure<ActivityStoreOptions>(builder.Configuration.GetSection(ActivityStoreOptions.SectionName));
builder.Services.Configure<ReminderStoreOptions>(builder.Configuration.GetSection(ReminderStoreOptions.SectionName));
builder.Services.Configure<ProfileStoreOptions>(builder.Configuration.GetSection(ProfileStoreOptions.SectionName));
builder.Services.Configure<DailyNoteStoreOptions>(builder.Configuration.GetSection(DailyNoteStoreOptions.SectionName));

var sharedMySqlConnectionString = builder.Configuration.GetConnectionString("MySql");

builder.Services.PostConfigure<UserStoreOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.ConnectionString))
    {
        options.ConnectionString = sharedMySqlConnectionString ?? string.Empty;
    }
});
builder.Services.PostConfigure<SnapshotStoreOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.MySqlConnectionString))
    {
        options.MySqlConnectionString = sharedMySqlConnectionString;
    }
});
builder.Services.PostConfigure<HealthRecordStoreOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.ConnectionString))
    {
        options.ConnectionString = sharedMySqlConnectionString ?? string.Empty;
    }
});
builder.Services.PostConfigure<SymptomRecordStoreOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.ConnectionString))
    {
        options.ConnectionString = sharedMySqlConnectionString ?? string.Empty;
    }
});
builder.Services.PostConfigure<ActivityStoreOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.ConnectionString))
    {
        options.ConnectionString = sharedMySqlConnectionString ?? string.Empty;
    }
});
builder.Services.PostConfigure<ReminderStoreOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.ConnectionString))
    {
        options.ConnectionString = sharedMySqlConnectionString ?? string.Empty;
    }
});
builder.Services.PostConfigure<ProfileStoreOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.ConnectionString))
    {
        options.ConnectionString = sharedMySqlConnectionString ?? string.Empty;
    }
});
builder.Services.PostConfigure<DailyNoteStoreOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.ConnectionString))
    {
        options.ConnectionString = sharedMySqlConnectionString ?? string.Empty;
    }
});

var authOptions = builder.Configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>() ?? new AuthOptions();
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions.SigningKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = authOptions.Issuer,
            ValidAudience = authOptions.Audience,
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DailyTracker API",
        Version = "v1",
        Description = "DailyTracker backend API for cloud sync, auth, reminders, profile, and health records."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Input your JWT token in this format: Bearer {your token here}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<SmsVerificationService>();
builder.Services.AddSingleton<UserMySqlStore>();
builder.Services.AddSingleton<SnapshotFileStore>();
builder.Services.AddSingleton<SnapshotMySqlStore>();
builder.Services.AddSingleton<HealthRecordMySqlStore>();
builder.Services.AddSingleton<SymptomRecordMySqlStore>();
builder.Services.AddSingleton<ActivityMySqlStore>();
builder.Services.AddSingleton<ReminderMySqlStore>();
builder.Services.AddSingleton<ProfileMySqlStore>();
builder.Services.AddSingleton<DailyNoteMySqlStore>();
builder.Services.AddSingleton<ISnapshotStore>(sp =>
{
    var options = sp.GetRequiredService<IOptions<SnapshotStoreOptions>>().Value;
    return string.Equals(options.Provider, "mysql", StringComparison.OrdinalIgnoreCase)
        ? sp.GetRequiredService<SnapshotMySqlStore>()
        : sp.GetRequiredService<SnapshotFileStore>();
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "DailyTracker API v1");
    options.RoutePrefix = "swagger";
    options.DocumentTitle = "DailyTracker Swagger";
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", (IOptions<SnapshotStoreOptions> snapshotOptions) => Results.Ok(new
{
    service = "DailyTracker Backend",
    message = "Cloud sync service is running.",
    endpoints = new[] { "/health", "/snapshot", "/swagger", "/api/auth/register", "/api/auth/login" },
    storage = snapshotOptions.Value.Provider
}));

app.MapGet("/health", (IOptions<SnapshotStoreOptions> snapshotOptions) => Results.Ok(new
{
    status = "ok",
    service = "daily-tracker-backend",
    serverTime = DateTimeOffset.UtcNow,
    storage = snapshotOptions.Value.Provider
}));

app.MapGet("/snapshot", async (ISnapshotStore store, CancellationToken cancellationToken) =>
{
    var snapshot = await store.ReadAsync(cancellationToken);
    return snapshot is null ? Results.NoContent() : Results.Ok(snapshot);
});

app.MapPut("/snapshot", async (SnapshotUpsertRequest request, ISnapshotStore store, CancellationToken cancellationToken) =>
{
    if (request.Snapshot.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
    {
        return Results.BadRequest(new { message = "snapshot is required" });
    }

    var record = new SnapshotRecord
    {
        Snapshot = request.Snapshot,
        UpdatedAt = string.IsNullOrWhiteSpace(request.UpdatedAt) ? DateTimeOffset.UtcNow.ToString("O") : request.UpdatedAt,
        SchemaVersion = request.SchemaVersion,
        SavedAt = DateTimeOffset.UtcNow.ToString("O")
    };

    await store.WriteAsync(record, cancellationToken);
    return Results.Ok(new
    {
        message = "snapshot saved",
        updatedAt = record.UpdatedAt,
        savedAt = record.SavedAt
    });
});

var auth = app.MapGroup("/api/auth");

auth.MapPost("/register", async (
    AuthRegisterRequest request,
    UserMySqlStore userStore,
    JwtTokenService tokenService,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Account))
    {
        return Results.BadRequest(new { message = "account is required" });
    }
    if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
    {
        return Results.BadRequest(new { message = "password must be at least 6 characters" });
    }

    var exists = await userStore.FindByAccountAsync(request.Account.Trim(), cancellationToken);
    if (exists is not null)
    {
        return Results.Conflict(new { message = "account already exists" });
    }

    var user = await userStore.CreateAsync(request.Account.Trim(), request.Password, request.Nickname?.Trim(), cancellationToken);
    return Results.Ok(BuildAuthResponse(user, tokenService));
});

auth.MapPost("/login", async (
    AuthLoginRequest request,
    UserMySqlStore userStore,
    JwtTokenService tokenService,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Account) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "account and password are required" });
    }

    var user = await userStore.FindByAccountAsync(request.Account.Trim(), cancellationToken);
    if (user is null || !userStore.VerifyPassword(user, request.Password))
    {
        return Results.Unauthorized();
    }

    return Results.Ok(BuildAuthResponse(user, tokenService));
});

auth.MapPost("/send-sms", (
    AuthSendSmsRequest request,
    SmsVerificationService smsVerificationService,
    ILogger<Program> logger,
    IHostEnvironment environment) =>
{
    var phone = request.Phone?.Trim() ?? string.Empty;
    if (!IsValidChineseMainlandPhone(phone))
    {
        return Results.BadRequest(new { message = "valid phone is required" });
    }

    var result = smsVerificationService.IssueCode(phone);
    logger.LogInformation("SMS verification code issued for {Phone}: {Code}, expires at {ExpiresAt}",
        phone, result.Code, result.ExpiresAt);

    return Results.Ok(new
    {
        message = "sms code sent",
        expiresInSeconds = result.ExpiresInSeconds,
        debugCode = environment.IsDevelopment() ? result.Code : null
    });
});

auth.MapPost("/login-sms", async (
    AuthLoginSmsRequest request,
    SmsVerificationService smsVerificationService,
    UserMySqlStore userStore,
    JwtTokenService tokenService,
    CancellationToken cancellationToken) =>
{
    var account = request.Account?.Trim() ?? string.Empty;
    if (!IsValidChineseMainlandPhone(account))
    {
        return Results.BadRequest(new { message = "valid phone account is required" });
    }

    if (string.IsNullOrWhiteSpace(request.SmsCode))
    {
        return Results.BadRequest(new { message = "smsCode is required" });
    }

    if (!smsVerificationService.VerifyCode(account, request.SmsCode.Trim()))
    {
        return Results.Unauthorized();
    }

    var user = await userStore.FindByAccountAsync(account, cancellationToken);
    if (user is null)
    {
        user = await userStore.CreateAsync(
            account,
            Guid.NewGuid().ToString("N"),
            BuildSmsNickname(account),
            cancellationToken);
    }

    return Results.Ok(BuildAuthResponse(user, tokenService));
});

auth.MapGet("/me", async (
    HttpContext httpContext,
    UserMySqlStore userStore,
    CancellationToken cancellationToken) =>
{
    var currentUserId = ResolveUserIdFromToken(httpContext);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var user = await userStore.FindByIdAsync(currentUserId.Value, cancellationToken);
    return user is null ? Results.NotFound(new { message = "user not found" }) : Results.Ok(ToUserDto(user));
}).RequireAuthorization();

var activities = app.MapGroup("/api/activities");
activities.MapGet("/", async (string date, HttpContext httpContext, ActivityMySqlStore store, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(date))
    {
        return Results.BadRequest(new { message = "date is required" });
    }

    var userId = ResolveUserId(httpContext, store.GetDefaultUserId());
    var records = await store.ListByDateAsync(userId, date, cancellationToken);
    return Results.Ok(records);
});
activities.MapPost("/", async (ActivityUpsertRequest request, HttpContext httpContext, ActivityMySqlStore store, CancellationToken cancellationToken) =>
{
    var validation = ValidateActivityRequest(request);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var created = await store.CreateAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return Results.Created($"/api/activities/{created.Id}", created);
});
activities.MapPut("/{id:long}", async (long id, ActivityUpsertRequest request, HttpContext httpContext, ActivityMySqlStore store, CancellationToken cancellationToken) =>
{
    var validation = ValidateActivityRequest(request);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var updated = await store.UpdateAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return updated is null ? Results.NotFound(new { message = "activity not found" }) : Results.Ok(updated);
});
activities.MapDelete("/{id:long}", async (long id, HttpContext httpContext, ActivityMySqlStore store, CancellationToken cancellationToken) =>
{
    var deleted = await store.SoftDeleteAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound(new { message = "activity not found" });
});

var healthRecords = app.MapGroup("/api/health-records");
healthRecords.MapGet("/", async (string date, HttpContext httpContext, HealthRecordMySqlStore store, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(date)) return Results.BadRequest(new { message = "date is required" });
    var records = await store.ListByDateAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), date, cancellationToken);
    return Results.Ok(records);
});
healthRecords.MapPost("/", async (HealthRecordUpsertRequest request, HttpContext httpContext, HealthRecordMySqlStore store, CancellationToken cancellationToken) =>
{
    var validation = ValidateHealthRecordRequest(request);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var created = await store.CreateAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return Results.Created($"/api/health-records/{created.Id}", created);
});
healthRecords.MapPut("/{id:long}", async (long id, HealthRecordUpsertRequest request, HttpContext httpContext, HealthRecordMySqlStore store, CancellationToken cancellationToken) =>
{
    var validation = ValidateHealthRecordRequest(request);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var updated = await store.UpdateAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return updated is null ? Results.NotFound(new { message = "health record not found" }) : Results.Ok(updated);
});
healthRecords.MapDelete("/{id:long}", async (long id, HttpContext httpContext, HealthRecordMySqlStore store, CancellationToken cancellationToken) =>
{
    var deleted = await store.SoftDeleteAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound(new { message = "health record not found" });
});

var symptomRecords = app.MapGroup("/api/symptom-records");
symptomRecords.MapGet("/", async (string date, HttpContext httpContext, SymptomRecordMySqlStore store, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(date)) return Results.BadRequest(new { message = "date is required" });
    var records = await store.ListByDateAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), date, cancellationToken);
    return Results.Ok(records);
});
symptomRecords.MapPost("/", async (SymptomRecordUpsertRequest request, HttpContext httpContext, SymptomRecordMySqlStore store, CancellationToken cancellationToken) =>
{
    var validation = ValidateSymptomRecordRequest(request);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var created = await store.CreateAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return Results.Created($"/api/symptom-records/{created.Id}", created);
});
symptomRecords.MapPut("/{id:long}", async (long id, SymptomRecordUpsertRequest request, HttpContext httpContext, SymptomRecordMySqlStore store, CancellationToken cancellationToken) =>
{
    var validation = ValidateSymptomRecordRequest(request);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var updated = await store.UpdateAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return updated is null ? Results.NotFound(new { message = "symptom record not found" }) : Results.Ok(updated);
});
symptomRecords.MapDelete("/{id:long}", async (long id, HttpContext httpContext, SymptomRecordMySqlStore store, CancellationToken cancellationToken) =>
{
    var deleted = await store.SoftDeleteAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound(new { message = "symptom record not found" });
});

var reminders = app.MapGroup("/api/reminders");
reminders.MapGet("/", async (HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
    Results.Ok(await store.ListAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), cancellationToken)));
reminders.MapGet("/today", async (HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
{
    var today = DateTime.Now.ToString("yyyy-MM-dd");
    return Results.Ok(await store.ListTodayAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), today, cancellationToken));
});
reminders.MapGet("/upcoming", async (HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
{
    var now = DateTime.Now;
    return Results.Ok(await store.ListUpcomingAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), now.ToString("yyyy-MM-dd"), now.ToString("HH:mm"), cancellationToken));
});
reminders.MapPost("/", async (ReminderUpsertRequest request, HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
{
    var validation = ValidateReminderRequest(request);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var created = await store.CreateAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return Results.Created($"/api/reminders/{created.Id}", created);
});
reminders.MapPut("/{id:long}", async (long id, ReminderUpsertRequest request, HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
{
    var validation = ValidateReminderRequest(request);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var updated = await store.UpdateAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return updated is null ? Results.NotFound(new { message = "reminder not found" }) : Results.Ok(updated);
});
reminders.MapDelete("/{id:long}", async (long id, HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
{
    var deleted = await store.SoftDeleteAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound(new { message = "reminder not found" });
});
reminders.MapPost("/{id:long}/complete", async (long id, HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
{
    var updated = await store.CompleteAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), cancellationToken);
    return updated is null ? Results.NotFound(new { message = "reminder not found" }) : Results.Ok(updated);
});
reminders.MapPost("/{id:long}/reopen", async (long id, HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
{
    var updated = await store.ReopenAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), cancellationToken);
    return updated is null ? Results.NotFound(new { message = "reminder not found" }) : Results.Ok(updated);
});
reminders.MapPost("/{id:long}/snooze", async (long id, ReminderSnoozeRequest request, HttpContext httpContext, ReminderMySqlStore store, CancellationToken cancellationToken) =>
{
    if (request.Minutes <= 0) return Results.BadRequest(new { message = "minutes must be greater than 0" });
    var updated = await store.SnoozeAsync(id, ResolveUserId(httpContext, store.GetDefaultUserId()), request.Minutes, cancellationToken);
    return updated is null ? Results.NotFound(new { message = "reminder not found" }) : Results.Ok(updated);
});

var profileApi = app.MapGroup("/api/profile");
profileApi.MapGet("/", async (HttpContext httpContext, ProfileMySqlStore store, CancellationToken cancellationToken) =>
{
    var profile = await store.GetAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), cancellationToken);
    return profile is null ? Results.NoContent() : Results.Ok(profile);
});
profileApi.MapPut("/", async (ProfileUpsertRequest request, HttpContext httpContext, ProfileMySqlStore store, CancellationToken cancellationToken) =>
{
    var updated = await store.UpsertAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), request, cancellationToken);
    return Results.Ok(updated);
});

var dailyNotes = app.MapGroup("/api/daily-notes");
dailyNotes.MapGet("/{date}", async (string date, HttpContext httpContext, DailyNoteMySqlStore store, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(date)) return Results.BadRequest(new { message = "date is required" });
    var note = await store.GetByDateAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), date, cancellationToken);
    return note is null ? Results.NoContent() : Results.Ok(note);
});
dailyNotes.MapPut("/{date}", async (string date, DailyNoteUpsertRequest request, HttpContext httpContext, DailyNoteMySqlStore store, CancellationToken cancellationToken) =>
{
    var normalizedRequest = new DailyNoteUpsertRequest
    {
        NoteDate = string.IsNullOrWhiteSpace(request.NoteDate) ? date : request.NoteDate,
        Content = request.Content
    };
    var validation = ValidateDailyNoteRequest(normalizedRequest);
    if (validation is not null) return Results.BadRequest(new { message = validation });
    var updated = await store.UpsertAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), normalizedRequest, cancellationToken);
    return Results.Ok(updated);
});
dailyNotes.MapDelete("/{date}", async (string date, HttpContext httpContext, DailyNoteMySqlStore store, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(date)) return Results.BadRequest(new { message = "date is required" });
    var deleted = await store.SoftDeleteByDateAsync(ResolveUserId(httpContext, store.GetDefaultUserId()), date, cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound(new { message = "daily note not found" });
});

app.Run();

static AuthResponseDto BuildAuthResponse(UserRecord user, JwtTokenService tokenService) =>
    new()
    {
        Token = tokenService.CreateToken(user),
        User = ToUserDto(user)
    };

static UserDto ToUserDto(UserRecord user) =>
    new()
    {
        Id = user.Id,
        Account = user.Account,
        Nickname = user.Nickname
    };

static long ResolveUserId(HttpContext httpContext, long fallbackUserId)
    => ResolveUserIdFromToken(httpContext) ?? fallbackUserId;

static bool IsValidChineseMainlandPhone(string value)
    => System.Text.RegularExpressions.Regex.IsMatch(value, "^1[3-9]\\d{9}$");

static string BuildSmsNickname(string phone)
    => phone.Length == 11 ? $"用户{phone[^4..]}" : phone;

static long? ResolveUserIdFromToken(HttpContext httpContext)
{
    var claimValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? httpContext.User.FindFirstValue("sub");
    return long.TryParse(claimValue, out var userId) ? userId : null;
}

static string? ValidateHealthRecordRequest(HealthRecordUpsertRequest request)
{
    if (string.IsNullOrWhiteSpace(request.RecordDate)) return "recordDate is required";
    if (string.IsNullOrWhiteSpace(request.Type)) return "type is required";
    if (string.IsNullOrWhiteSpace(request.Value)) return "value is required";
    return null;
}

static string? ValidateSymptomRecordRequest(SymptomRecordUpsertRequest request)
{
    if (string.IsNullOrWhiteSpace(request.RecordDate)) return "recordDate is required";
    if (string.IsNullOrWhiteSpace(request.Description)) return "description is required";
    return null;
}

static string? ValidateActivityRequest(ActivityUpsertRequest request)
{
    if (string.IsNullOrWhiteSpace(request.ActivityDate)) return "activityDate is required";
    if (string.IsNullOrWhiteSpace(request.Type)) return "type is required";
    if (string.IsNullOrWhiteSpace(request.Content)) return "content is required";
    return null;
}

static string? ValidateReminderRequest(ReminderUpsertRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Title)) return "title is required";
    if (string.IsNullOrWhiteSpace(request.Type)) return "type is required";
    if (string.IsNullOrWhiteSpace(request.ReminderDate)) return "reminderDate is required";
    if (string.IsNullOrWhiteSpace(request.ReminderTime)) return "reminderTime is required";
    return null;
}

static string? ValidateDailyNoteRequest(DailyNoteUpsertRequest request)
{
    if (string.IsNullOrWhiteSpace(request.NoteDate)) return "noteDate is required";
    if (string.IsNullOrWhiteSpace(request.Content)) return "content is required";
    return null;
}
