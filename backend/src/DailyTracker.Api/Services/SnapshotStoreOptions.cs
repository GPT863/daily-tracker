namespace DailyTracker.Api.Services;

public sealed class SnapshotStoreOptions
{
    public const string SectionName = "SnapshotStore";

    public string Provider { get; set; } = "file";

    public string FilePath { get; set; } = "../../data/cloud-sync-snapshot.json";

    public string? MySqlConnectionString { get; set; }

    public string TableName { get; set; } = "cloud_sync_snapshots";

    public string ScopeKey { get; set; } = "default";
}
