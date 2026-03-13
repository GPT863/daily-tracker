using DailyTracker.Api.Models;

namespace DailyTracker.Api.Services;

public interface ISnapshotStore
{
    Task<SnapshotRecord?> ReadAsync(CancellationToken cancellationToken);

    Task WriteAsync(SnapshotRecord record, CancellationToken cancellationToken);
}
