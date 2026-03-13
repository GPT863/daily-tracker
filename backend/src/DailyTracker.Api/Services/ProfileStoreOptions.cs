namespace DailyTracker.Api.Services;

public sealed class ProfileStoreOptions
{
    public const string SectionName = "ProfileStore";

    public string ConnectionString { get; set; } = string.Empty;

    public string TableName { get; set; } = "user_profiles";

    public long DefaultUserId { get; set; } = 1;
}
