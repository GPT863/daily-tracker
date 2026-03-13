namespace DailyTracker.Api.Services;

public sealed class ReminderStoreOptions
{
    public const string SectionName = "ReminderStore";

    public string ConnectionString { get; set; } = string.Empty;

    public string TableName { get; set; } = "reminders";

    public long DefaultUserId { get; set; } = 1;
}
