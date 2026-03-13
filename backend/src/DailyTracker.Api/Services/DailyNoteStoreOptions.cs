namespace DailyTracker.Api.Services;

public sealed class DailyNoteStoreOptions
{
    public const string SectionName = "DailyNoteStore";

    public string ConnectionString { get; set; } = string.Empty;

    public string TableName { get; set; } = "daily_notes";

    public long DefaultUserId { get; set; } = 1;
}
