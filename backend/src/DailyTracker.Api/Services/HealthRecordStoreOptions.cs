namespace DailyTracker.Api.Services;

public sealed class HealthRecordStoreOptions
{
    public const string SectionName = "HealthRecordStore";

    public string ConnectionString { get; set; } = string.Empty;

    public string TableName { get; set; } = "health_records";

    public long DefaultUserId { get; set; } = 1;
}
