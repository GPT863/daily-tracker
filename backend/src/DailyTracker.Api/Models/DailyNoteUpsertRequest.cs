namespace DailyTracker.Api.Models;

public sealed class DailyNoteUpsertRequest
{
    public string NoteDate { get; init; } = string.Empty;

    public string Content { get; init; } = string.Empty;
}
