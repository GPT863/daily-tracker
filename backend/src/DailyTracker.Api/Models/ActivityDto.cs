namespace DailyTracker.Api.Models;

public sealed class ActivityDto
{
    public long Id { get; init; }

    public long UserId { get; init; }

    public string ActivityDate { get; init; } = string.Empty;

    public string? StartTime { get; init; }

    public string? EndTime { get; init; }

    public int? DurationMinutes { get; init; }

    public string Type { get; init; } = string.Empty;

    public string Content { get; init; } = string.Empty;

    public string? Feeling { get; init; }

    public string? ImageUrl { get; init; }

    public string? Source { get; init; }

    public string CreatedAt { get; init; } = string.Empty;

    public string UpdatedAt { get; init; } = string.Empty;
}
