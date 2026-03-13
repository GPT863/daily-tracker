namespace DailyTracker.Api.Models;

public sealed class AuthResponseDto
{
    public string Token { get; init; } = string.Empty;

    public UserDto User { get; init; } = new();
}
