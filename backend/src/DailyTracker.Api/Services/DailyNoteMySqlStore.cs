using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace DailyTracker.Api.Services;

public sealed class DailyNoteMySqlStore
{
    private readonly DailyNoteStoreOptions _options;

    public DailyNoteMySqlStore(IOptions<DailyNoteStoreOptions> options)
    {
        _options = options.Value;
    }

    public async Task<DailyNoteDto?> GetByDateAsync(long userId, string noteDate, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, note_date, content, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE user_id = @userId AND note_date = @noteDate AND is_deleted = 0
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@noteDate", noteDate);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return Map(reader);
    }

    public async Task<DailyNoteDto> UpsertAsync(long userId, DailyNoteUpsertRequest request, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var existing = await GetByDateAsync(userId, request.NoteDate, cancellationToken);
        var createdAt = existing?.CreatedAt ?? DateTimeOffset.UtcNow.ToString("O");
        var updatedAt = DateTimeOffset.UtcNow.ToString("O");

        var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO `{_options.TableName}`
                (user_id, note_date, content, is_deleted, created_at, updated_at)
            VALUES
                (@userId, @noteDate, @content, 0, @createdAt, @updatedAt)
            ON DUPLICATE KEY UPDATE
                content = VALUES(content),
                is_deleted = 0,
                updated_at = VALUES(updated_at);
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@noteDate", request.NoteDate);
        command.Parameters.AddWithValue("@content", request.Content);
        command.Parameters.AddWithValue("@createdAt", createdAt);
        command.Parameters.AddWithValue("@updatedAt", updatedAt);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return (await GetByDateAsync(userId, request.NoteDate, cancellationToken))!;
    }

    public async Task<bool> SoftDeleteByDateAsync(long userId, string noteDate, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE `{_options.TableName}`
            SET is_deleted = 1, updated_at = @updatedAt
            WHERE user_id = @userId AND note_date = @noteDate AND is_deleted = 0;
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@noteDate", noteDate);
        command.Parameters.AddWithValue("@updatedAt", DateTimeOffset.UtcNow.ToString("O"));
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public long GetDefaultUserId() => _options.DefaultUserId;

    private static DailyNoteDto Map(MySqlDataReader reader)
    {
        var id = reader.GetOrdinal("id");
        var userId = reader.GetOrdinal("user_id");
        var noteDate = reader.GetOrdinal("note_date");
        var content = reader.GetOrdinal("content");
        var createdAt = reader.GetOrdinal("created_at");
        var updatedAt = reader.GetOrdinal("updated_at");

        return new DailyNoteDto
        {
            Id = reader.GetInt64(id),
            UserId = reader.GetInt64(userId),
            NoteDate = reader.GetString(noteDate),
            Content = reader.GetString(content),
            CreatedAt = reader.GetString(createdAt),
            UpdatedAt = reader.GetString(updatedAt)
        };
    }

    private MySqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("DailyNoteStore:ConnectionString is required.");
        }

        return new MySqlConnection(_options.ConnectionString);
    }

    private async Task EnsureTableAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        var command = connection.CreateCommand();
        command.CommandText = $"""
            CREATE TABLE IF NOT EXISTS `{_options.TableName}` (
                `id` BIGINT NOT NULL AUTO_INCREMENT,
                `user_id` BIGINT NOT NULL,
                `note_date` VARCHAR(16) NOT NULL,
                `content` TEXT NOT NULL,
                `is_deleted` TINYINT NOT NULL DEFAULT 0,
                `created_at` VARCHAR(64) NOT NULL,
                `updated_at` VARCHAR(64) NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_user_date` (`user_id`, `note_date`),
                KEY `idx_user_note_date` (`user_id`, `note_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
