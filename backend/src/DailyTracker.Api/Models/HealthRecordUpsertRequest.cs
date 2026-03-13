namespace DailyTracker.Api.Models;

public sealed class HealthRecordUpsertRequest
{
    public string RecordDate { get; init; } = string.Empty;

    public string? RecordTime { get; init; }

    public string Type { get; init; } = string.Empty;

    public string Value { get; init; } = string.Empty;

    public string? Unit { get; init; }

    public string? Notes { get; init; }

    public string? ImageUrl { get; init; }
}
