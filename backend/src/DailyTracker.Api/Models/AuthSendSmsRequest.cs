namespace DailyTracker.Api.Models;

public sealed class AuthSendSmsRequest
{
    public string Phone { get; init; } = string.Empty;
}
