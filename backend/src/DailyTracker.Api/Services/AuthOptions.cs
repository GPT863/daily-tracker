namespace DailyTracker.Api.Services;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public string Issuer { get; set; } = "DailyTracker";

    public string Audience { get; set; } = "DailyTracker.Client";

    public string SigningKey { get; set; } = "DailyTracker.ChangeThisSecretKey.ForDevelopment.2026";

    public int ExpireMinutes { get; set; } = 1440;
}
