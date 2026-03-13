using System.Text.Json;
using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;

namespace DailyTracker.Api.Services;

public sealed class SnapshotFileStore : ISnapshotStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string _filePath;

    public SnapshotFileStore(IOptions<SnapshotStoreOptions> options, IWebHostEnvironment environment)
    {
        var configuredPath = options.Value.FilePath;
        _filePath = Path.GetFullPath(
            Path.IsPathRooted(configuredPath)
                ? configuredPath
                : Path.Combine(environment.ContentRootPath, configuredPath));
    }

    public async Task<SnapshotRecord?> ReadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_filePath))
        {
            return null;
        }

        await using var stream = File.OpenRead(_filePath);
        return await JsonSerializer.DeserializeAsync<SnapshotRecord>(stream, SerializerOptions, cancellationToken);
    }

    public async Task WriteAsync(SnapshotRecord record, CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(_filePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, record, SerializerOptions, cancellationToken);
    }
}
