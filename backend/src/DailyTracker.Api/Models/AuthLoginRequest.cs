namespace DailyTracker.Api.Models;

public sealed class AuthLoginRequest
{
    public string Account { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;
}
