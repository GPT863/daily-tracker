namespace DailyTracker.Api.Models;

public sealed class ActivityUpsertRequest
{
    public string ActivityDate { get; init; } = string.Empty;

    public string? StartTime { get; init; }

    public string? EndTime { get; init; }

    public int? DurationMinutes { get; init; }

    public string Type { get; init; } = string.Empty;

    public string Content { get; init; } = string.Empty;

    public string? Feeling { get; init; }

    public string? ImageUrl { get; init; }

    public string? Source { get; init; }
}
