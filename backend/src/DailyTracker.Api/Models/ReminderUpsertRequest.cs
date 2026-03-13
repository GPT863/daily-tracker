namespace DailyTracker.Api.Models;

public sealed class ReminderUpsertRequest
{
    public string Title { get; init; } = string.Empty;

    public string Type { get; init; } = string.Empty;

    public string ReminderDate { get; init; } = string.Empty;

    public string ReminderTime { get; init; } = string.Empty;

    public string RepeatType { get; init; } = "none";

    public string? Notes { get; init; }

    public string? ImageUrl { get; init; }
}
