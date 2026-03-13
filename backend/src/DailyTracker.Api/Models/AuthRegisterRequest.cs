namespace DailyTracker.Api.Models;

public sealed class AuthRegisterRequest
{
    public string Account { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string? Nickname { get; init; }
}
