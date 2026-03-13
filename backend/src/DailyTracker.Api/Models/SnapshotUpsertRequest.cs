using System.Text.Json;

namespace DailyTracker.Api.Models;

public sealed class SnapshotUpsertRequest
{
    public JsonElement Snapshot { get; init; }

    public string? UpdatedAt { get; init; }

    public int? SchemaVersion { get; init; }
}
