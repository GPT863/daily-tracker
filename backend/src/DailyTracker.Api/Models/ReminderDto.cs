namespace DailyTracker.Api.Models;

public sealed class ReminderDto
{
    public long Id { get; init; }

    public long UserId { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Type { get; init; } = string.Empty;

    public string ReminderDate { get; init; } = string.Empty;

    public string ReminderTime { get; init; } = string.Empty;

    public string RepeatType { get; init; } = "none";

    public string? Notes { get; init; }

    public string? ImageUrl { get; init; }

    public bool Completed { get; init; }

    public string? CompletedAt { get; init; }

    public string? SnoozeUntil { get; init; }

    public int SnoozeCount { get; init; }

    public string CreatedAt { get; init; } = string.Empty;

    public string UpdatedAt { get; init; } = string.Empty;
}
