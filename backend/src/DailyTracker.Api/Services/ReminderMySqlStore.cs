using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace DailyTracker.Api.Services;

public sealed class ReminderMySqlStore
{
    private readonly ReminderStoreOptions _options;

    public ReminderMySqlStore(IOptions<ReminderStoreOptions> options)
    {
        _options = options.Value;
    }

    public async Task<IReadOnlyList<ReminderDto>> ListAsync(long userId, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, title, type, reminder_date, reminder_time, repeat_type, notes, image_url,
                   completed, completed_at, snooze_until, snooze_count, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE user_id = @userId AND is_deleted = 0
            ORDER BY reminder_date DESC, reminder_time DESC, id DESC;
            """;
        command.Parameters.AddWithValue("@userId", userId);

        var results = new List<ReminderDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    public async Task<IReadOnlyList<ReminderDto>> ListTodayAsync(long userId, string today, CancellationToken cancellationToken)
    {
        return await ListByDateFilterAsync(userId, $"reminder_date = @today AND completed = 0", ("@today", today), cancellationToken);
    }

    public async Task<IReadOnlyList<ReminderDto>> ListUpcomingAsync(long userId, string nowIsoDate, string nowTime, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, title, type, reminder_date, reminder_time, repeat_type, notes, image_url,
                   completed, completed_at, snooze_until, snooze_count, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE user_id = @userId
              AND is_deleted = 0
              AND completed = 0
              AND (
                    reminder_date > @today
                    OR (reminder_date = @today AND reminder_time >= @nowTime)
                  )
            ORDER BY reminder_date ASC, reminder_time ASC, id ASC;
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@today", nowIsoDate);
        command.Parameters.AddWithValue("@nowTime", nowTime);

        var results = new List<ReminderDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    public async Task<ReminderDto> CreateAsync(long userId, ReminderUpsertRequest request, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var now = DateTimeOffset.UtcNow.ToString("O");
        var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO `{_options.TableName}`
                (user_id, title, type, reminder_date, reminder_time, repeat_type, notes, image_url, completed, completed_at, snooze_until, snooze_count, is_deleted, created_at, updated_at)
            VALUES
                (@userId, @title, @type, @reminderDate, @reminderTime, @repeatType, @notes, @imageUrl, 0, NULL, NULL, 0, 0, @createdAt, @updatedAt);
            SELECT LAST_INSERT_ID();
            """;
        command.Parameters.AddWithValue("@userId", userId);
        BindUpsertParameters(command, request, now);

        var insertedId = Convert.ToInt64(await command.ExecuteScalarAsync(cancellationToken));
        return (await GetByIdAsync(insertedId, userId, cancellationToken))!;
    }

    public async Task<ReminderDto?> UpdateAsync(long id, long userId, ReminderUpsertRequest request, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE `{_options.TableName}`
            SET
                title = @title,
                type = @type,
                reminder_date = @reminderDate,
                reminder_time = @reminderTime,
                repeat_type = @repeatType,
                notes = @notes,
                image_url = @imageUrl,
                updated_at = @updatedAt
            WHERE id = @id AND user_id = @userId AND is_deleted = 0;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@userId", userId);
        BindUpsertParameters(command, request, DateTimeOffset.UtcNow.ToString("O"));

        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0) return null;
        return await GetByIdAsync(id, userId, cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(long id, long userId, CancellationToken cancellationToken)
    {
        return await ExecuteActionAsync(
            id,
            userId,
            """
            is_deleted = 1,
            updated_at = @updatedAt
            """,
            command => command.Parameters.AddWithValue("@updatedAt", DateTimeOffset.UtcNow.ToString("O")),
            cancellationToken);
    }

    public async Task<ReminderDto?> CompleteAsync(long id, long userId, CancellationToken cancellationToken)
    {
        var completedAt = DateTimeOffset.UtcNow.ToString("O");
        var changed = await ExecuteActionAsync(
            id,
            userId,
            """
            completed = 1,
            completed_at = @completedAt,
            snooze_until = NULL,
            updated_at = @updatedAt
            """,
            command =>
            {
                command.Parameters.AddWithValue("@completedAt", completedAt);
                command.Parameters.AddWithValue("@updatedAt", completedAt);
            },
            cancellationToken);

        return changed ? await GetByIdAsync(id, userId, cancellationToken) : null;
    }

    public async Task<ReminderDto?> ReopenAsync(long id, long userId, CancellationToken cancellationToken)
    {
        var changed = await ExecuteActionAsync(
            id,
            userId,
            """
            completed = 0,
            completed_at = NULL,
            updated_at = @updatedAt
            """,
            command => command.Parameters.AddWithValue("@updatedAt", DateTimeOffset.UtcNow.ToString("O")),
            cancellationToken);

        return changed ? await GetByIdAsync(id, userId, cancellationToken) : null;
    }

    public async Task<ReminderDto?> SnoozeAsync(long id, long userId, int minutes, CancellationToken cancellationToken)
    {
        var snoozeUntil = DateTimeOffset.UtcNow.AddMinutes(minutes).ToString("O");
        var changed = await ExecuteActionAsync(
            id,
            userId,
            """
            snooze_until = @snoozeUntil,
            snooze_count = snooze_count + 1,
            updated_at = @updatedAt
            """,
            command =>
            {
                command.Parameters.AddWithValue("@snoozeUntil", snoozeUntil);
                command.Parameters.AddWithValue("@updatedAt", DateTimeOffset.UtcNow.ToString("O"));
            },
            cancellationToken);

        return changed ? await GetByIdAsync(id, userId, cancellationToken) : null;
    }

    public long GetDefaultUserId() => _options.DefaultUserId;

    private async Task<IReadOnlyList<ReminderDto>> ListByDateFilterAsync(
        long userId,
        string filter,
        (string Name, string Value) parameter,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, title, type, reminder_date, reminder_time, repeat_type, notes, image_url,
                   completed, completed_at, snooze_until, snooze_count, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE user_id = @userId AND is_deleted = 0 AND {filter}
            ORDER BY reminder_date ASC, reminder_time ASC, id ASC;
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue(parameter.Name, parameter.Value);

        var results = new List<ReminderDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    private async Task<bool> ExecuteActionAsync(
        long id,
        long userId,
        string setClause,
        Action<MySqlCommand> fillExtraParameters,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE `{_options.TableName}`
            SET {setClause}
            WHERE id = @id AND user_id = @userId AND is_deleted = 0;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@userId", userId);
        fillExtraParameters(command);

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private async Task<ReminderDto?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, title, type, reminder_date, reminder_time, repeat_type, notes, image_url,
                   completed, completed_at, snooze_until, snooze_count, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE id = @id AND user_id = @userId AND is_deleted = 0
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return Map(reader);
    }

    private void BindUpsertParameters(MySqlCommand command, ReminderUpsertRequest request, string now)
    {
        command.Parameters.AddWithValue("@title", request.Title);
        command.Parameters.AddWithValue("@type", request.Type);
        command.Parameters.AddWithValue("@reminderDate", request.ReminderDate);
        command.Parameters.AddWithValue("@reminderTime", request.ReminderTime);
        command.Parameters.AddWithValue("@repeatType", string.IsNullOrWhiteSpace(request.RepeatType) ? "none" : request.RepeatType);
        command.Parameters.AddWithValue("@notes", string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes);
        command.Parameters.AddWithValue("@imageUrl", string.IsNullOrWhiteSpace(request.ImageUrl) ? DBNull.Value : request.ImageUrl);
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);
    }

    private static ReminderDto Map(MySqlDataReader reader)
    {
        int O(string name) => reader.GetOrdinal(name);
        return new ReminderDto
        {
            Id = reader.GetInt64(O("id")),
            UserId = reader.GetInt64(O("user_id")),
            Title = reader.GetString(O("title")),
            Type = reader.GetString(O("type")),
            ReminderDate = reader.GetString(O("reminder_date")),
            ReminderTime = reader.GetString(O("reminder_time")),
            RepeatType = reader.GetString(O("repeat_type")),
            Notes = reader.IsDBNull(O("notes")) ? null : reader.GetString(O("notes")),
            ImageUrl = reader.IsDBNull(O("image_url")) ? null : reader.GetString(O("image_url")),
            Completed = reader.GetBoolean(O("completed")),
            CompletedAt = reader.IsDBNull(O("completed_at")) ? null : reader.GetString(O("completed_at")),
            SnoozeUntil = reader.IsDBNull(O("snooze_until")) ? null : reader.GetString(O("snooze_until")),
            SnoozeCount = reader.IsDBNull(O("snooze_count")) ? 0 : reader.GetInt32(O("snooze_count")),
            CreatedAt = reader.GetString(O("created_at")),
            UpdatedAt = reader.GetString(O("updated_at"))
        };
    }

    private MySqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("ReminderStore:ConnectionString is required.");
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
                `title` VARCHAR(128) NOT NULL,
                `type` VARCHAR(32) NOT NULL,
                `reminder_date` VARCHAR(16) NOT NULL,
                `reminder_time` VARCHAR(16) NOT NULL,
                `repeat_type` VARCHAR(16) NOT NULL DEFAULT 'none',
                `notes` TEXT NULL,
                `image_url` VARCHAR(500) NULL,
                `completed` TINYINT NOT NULL DEFAULT 0,
                `completed_at` VARCHAR(64) NULL,
                `snooze_until` VARCHAR(64) NULL,
                `snooze_count` INT NOT NULL DEFAULT 0,
                `is_deleted` TINYINT NOT NULL DEFAULT 0,
                `created_at` VARCHAR(64) NOT NULL,
                `updated_at` VARCHAR(64) NOT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_user_date` (`user_id`, `reminder_date`),
                KEY `idx_user_status` (`user_id`, `completed`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
