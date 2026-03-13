namespace DailyTracker.Api.Models;

public sealed class UserDto
{
    public long Id { get; init; }

    public string Account { get; init; } = string.Empty;

    public string? Nickname { get; init; }
}
