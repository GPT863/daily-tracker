namespace DailyTracker.Api.Models;

public sealed class SymptomRecordUpsertRequest
{
    public string RecordDate { get; init; } = string.Empty;

    public string? RecordTime { get; init; }

    public string Description { get; init; } = string.Empty;

    public string? Measures { get; init; }

    public string? ImageUrl { get; init; }
}
