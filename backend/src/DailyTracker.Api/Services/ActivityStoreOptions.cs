namespace DailyTracker.Api.Services;

public sealed class ActivityStoreOptions
{
    public const string SectionName = "ActivityStore";

    public string ConnectionString { get; set; } = string.Empty;

    public string TableName { get; set; } = "activity_records";

    public long DefaultUserId { get; set; } = 1;
}
