namespace DailyTracker.Api.Models;

public sealed class DailyNoteDto
{
    public long Id { get; init; }

    public long UserId { get; init; }

    public string NoteDate { get; init; } = string.Empty;

    public string Content { get; init; } = string.Empty;

    public string CreatedAt { get; init; } = string.Empty;

    public string UpdatedAt { get; init; } = string.Empty;
}
