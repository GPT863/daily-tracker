namespace DailyTracker.Api.Models;

public sealed class AuthLoginSmsRequest
{
    public string Account { get; init; } = string.Empty;

    public string SmsCode { get; init; } = string.Empty;
}
