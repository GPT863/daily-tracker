namespace DailyTracker.Api.Models;

public sealed class HealthRecordDto
{
    public long Id { get; init; }

    public long UserId { get; init; }

    public string RecordDate { get; init; } = string.Empty;

    public string? RecordTime { get; init; }

    public string Type { get; init; } = string.Empty;

    public string Value { get; init; } = string.Empty;

    public string? Unit { get; init; }

    public string? Notes { get; init; }

    public string? ImageUrl { get; init; }

    public string CreatedAt { get; init; } = string.Empty;

    public string UpdatedAt { get; init; } = string.Empty;
}
