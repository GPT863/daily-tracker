using System.Text.Json;
using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace DailyTracker.Api.Services;

public sealed class SnapshotMySqlStore : ISnapshotStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false
    };

    private readonly SnapshotStoreOptions _options;

    public SnapshotMySqlStore(IOptions<SnapshotStoreOptions> options)
    {
        _options = options.Value;
    }

    public async Task<SnapshotRecord?> ReadAsync(CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT snapshot_json, updated_at, schema_version, saved_at
            FROM `{_options.TableName}`
            WHERE scope_key = @scopeKey
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@scopeKey", _options.ScopeKey);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var snapshotJsonOrdinal = reader.GetOrdinal("snapshot_json");
        var updatedAtOrdinal = reader.GetOrdinal("updated_at");
        var schemaVersionOrdinal = reader.GetOrdinal("schema_version");
        var savedAtOrdinal = reader.GetOrdinal("saved_at");

        var snapshotJson = reader.GetString(snapshotJsonOrdinal);
        using var document = JsonDocument.Parse(snapshotJson);

        return new SnapshotRecord
        {
            Snapshot = document.RootElement.Clone(),
            UpdatedAt = reader.IsDBNull(updatedAtOrdinal) ? null : reader.GetString(updatedAtOrdinal),
            SchemaVersion = reader.IsDBNull(schemaVersionOrdinal) ? null : reader.GetInt32(schemaVersionOrdinal),
            SavedAt = reader.IsDBNull(savedAtOrdinal)
                ? DateTimeOffset.UtcNow.ToString("O")
                : reader.GetString(savedAtOrdinal)
        };
    }

    public async Task WriteAsync(SnapshotRecord record, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO `{_options.TableName}` (scope_key, snapshot_json, updated_at, schema_version, saved_at)
            VALUES (@scopeKey, @snapshotJson, @updatedAt, @schemaVersion, @savedAt)
            ON DUPLICATE KEY UPDATE
                snapshot_json = VALUES(snapshot_json),
                updated_at = VALUES(updated_at),
                schema_version = VALUES(schema_version),
                saved_at = VALUES(saved_at);
            """;
        command.Parameters.AddWithValue("@scopeKey", _options.ScopeKey);
        command.Parameters.AddWithValue("@snapshotJson", JsonSerializer.Serialize(record.Snapshot, SerializerOptions));
        command.Parameters.AddWithValue("@updatedAt", record.UpdatedAt);
        command.Parameters.AddWithValue("@schemaVersion", record.SchemaVersion);
        command.Parameters.AddWithValue("@savedAt", record.SavedAt);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private MySqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.MySqlConnectionString))
        {
            throw new InvalidOperationException("SnapshotStore:MySqlConnectionString is required when Provider=mysql.");
        }

        return new MySqlConnection(_options.MySqlConnectionString);
    }

    private async Task EnsureTableAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        var command = connection.CreateCommand();
        command.CommandText = $"""
            CREATE TABLE IF NOT EXISTS `{_options.TableName}` (
                `id` BIGINT NOT NULL AUTO_INCREMENT,
                `scope_key` VARCHAR(128) NOT NULL,
                `snapshot_json` LONGTEXT NOT NULL,
                `updated_at` VARCHAR(64) NULL,
                `schema_version` INT NULL,
                `saved_at` VARCHAR(64) NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_scope_key` (`scope_key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
