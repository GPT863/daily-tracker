namespace DailyTracker.Api.Services;

public sealed class SymptomRecordStoreOptions
{
    public const string SectionName = "SymptomRecordStore";

    public string ConnectionString { get; set; } = string.Empty;

    public string TableName { get; set; } = "symptom_records";

    public long DefaultUserId { get; set; } = 1;
}
