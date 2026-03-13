namespace DailyTracker.Api.Services;

public sealed class UserStoreOptions
{
    public const string SectionName = "UserStore";

    public string ConnectionString { get; set; } = string.Empty;

    public string TableName { get; set; } = "users";
}
