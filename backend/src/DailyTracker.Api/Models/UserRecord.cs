namespace DailyTracker.Api.Models;

public sealed class UserRecord
{
    public long Id { get; init; }

    public string Account { get; init; } = string.Empty;

    public string PasswordHash { get; init; } = string.Empty;

    public string? Nickname { get; init; }

    public string CreatedAt { get; init; } = string.Empty;

    public string UpdatedAt { get; init; } = string.Empty;
}
