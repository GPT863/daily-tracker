using System.Text.Json;

namespace DailyTracker.Api.Models;

public sealed class SnapshotRecord
{
    public JsonElement Snapshot { get; init; }

    public string? UpdatedAt { get; init; }

    public int? SchemaVersion { get; init; }

    public string SavedAt { get; init; } = DateTimeOffset.UtcNow.ToString("O");
}
