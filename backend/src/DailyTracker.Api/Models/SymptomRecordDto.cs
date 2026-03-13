namespace DailyTracker.Api.Models;

public sealed class SymptomRecordDto
{
    public long Id { get; init; }

    public long UserId { get; init; }

    public string RecordDate { get; init; } = string.Empty;

    public string? RecordTime { get; init; }

    public string Description { get; init; } = string.Empty;

    public string? Measures { get; init; }

    public string? ImageUrl { get; init; }

    public string CreatedAt { get; init; } = string.Empty;

    public string UpdatedAt { get; init; } = string.Empty;
}
