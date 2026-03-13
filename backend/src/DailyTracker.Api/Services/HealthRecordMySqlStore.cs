using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace DailyTracker.Api.Services;

public sealed class HealthRecordMySqlStore
{
    private readonly HealthRecordStoreOptions _options;

    public HealthRecordMySqlStore(IOptions<HealthRecordStoreOptions> options)
    {
        _options = options.Value;
    }

    public async Task<IReadOnlyList<HealthRecordDto>> ListByDateAsync(
        long userId,
        string recordDate,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, record_date, record_time, type, value, unit, notes, image_url, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE user_id = @userId AND record_date = @recordDate AND is_deleted = 0
            ORDER BY COALESCE(record_time, '00:00:00') ASC, id ASC;
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@recordDate", recordDate);

        var results = new List<HealthRecordDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    public async Task<HealthRecordDto> CreateAsync(
        long userId,
        HealthRecordUpsertRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var now = DateTimeOffset.UtcNow.ToString("O");
        var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO `{_options.TableName}`
                (user_id, record_date, record_time, type, value, unit, notes, image_url, is_deleted, created_at, updated_at)
            VALUES
                (@userId, @recordDate, @recordTime, @type, @value, @unit, @notes, @imageUrl, 0, @createdAt, @updatedAt);
            SELECT LAST_INSERT_ID();
            """;
        command.Parameters.AddWithValue("@userId", userId);
        BindUpsertParameters(command, request, now);

        var insertedId = Convert.ToInt64(await command.ExecuteScalarAsync(cancellationToken));
        return (await GetByIdAsync(insertedId, userId, cancellationToken))!;
    }

    public async Task<HealthRecordDto?> UpdateAsync(
        long id,
        long userId,
        HealthRecordUpsertRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE `{_options.TableName}`
            SET
                record_date = @recordDate,
                record_time = @recordTime,
                type = @type,
                value = @value,
                unit = @unit,
                notes = @notes,
                image_url = @imageUrl,
                updated_at = @updatedAt
            WHERE id = @id AND user_id = @userId AND is_deleted = 0;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@userId", userId);
        BindUpsertParameters(command, request, DateTimeOffset.UtcNow.ToString("O"));

        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0)
        {
            return null;
        }

        return await GetByIdAsync(id, userId, cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(long id, long userId, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE `{_options.TableName}`
            SET is_deleted = 1, updated_at = @updatedAt
            WHERE id = @id AND user_id = @userId AND is_deleted = 0;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@updatedAt", DateTimeOffset.UtcNow.ToString("O"));

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public long GetDefaultUserId() => _options.DefaultUserId;

    private async Task<HealthRecordDto?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, record_date, record_time, type, value, unit, notes, image_url, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE id = @id AND user_id = @userId AND is_deleted = 0
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return Map(reader);
    }

    private void BindUpsertParameters(MySqlCommand command, HealthRecordUpsertRequest request, string now)
    {
        command.Parameters.AddWithValue("@recordDate", request.RecordDate);
        command.Parameters.AddWithValue("@recordTime", string.IsNullOrWhiteSpace(request.RecordTime) ? DBNull.Value : request.RecordTime);
        command.Parameters.AddWithValue("@type", request.Type);
        command.Parameters.AddWithValue("@value", request.Value);
        command.Parameters.AddWithValue("@unit", string.IsNullOrWhiteSpace(request.Unit) ? DBNull.Value : request.Unit);
        command.Parameters.AddWithValue("@notes", string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes);
        command.Parameters.AddWithValue("@imageUrl", string.IsNullOrWhiteSpace(request.ImageUrl) ? DBNull.Value : request.ImageUrl);
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);
    }

    private static HealthRecordDto Map(MySqlDataReader reader)
    {
        var id = reader.GetOrdinal("id");
        var userId = reader.GetOrdinal("user_id");
        var recordDate = reader.GetOrdinal("record_date");
        var recordTime = reader.GetOrdinal("record_time");
        var type = reader.GetOrdinal("type");
        var value = reader.GetOrdinal("value");
        var unit = reader.GetOrdinal("unit");
        var notes = reader.GetOrdinal("notes");
        var imageUrl = reader.GetOrdinal("image_url");
        var createdAt = reader.GetOrdinal("created_at");
        var updatedAt = reader.GetOrdinal("updated_at");

        return new HealthRecordDto
        {
            Id = reader.GetInt64(id),
            UserId = reader.GetInt64(userId),
            RecordDate = reader.GetString(recordDate),
            RecordTime = reader.IsDBNull(recordTime) ? null : reader.GetString(recordTime),
            Type = reader.GetString(type),
            Value = reader.GetString(value),
            Unit = reader.IsDBNull(unit) ? null : reader.GetString(unit),
            Notes = reader.IsDBNull(notes) ? null : reader.GetString(notes),
            ImageUrl = reader.IsDBNull(imageUrl) ? null : reader.GetString(imageUrl),
            CreatedAt = reader.GetString(createdAt),
            UpdatedAt = reader.GetString(updatedAt)
        };
    }

    private MySqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("HealthRecordStore:ConnectionString is required.");
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
                `record_date` VARCHAR(16) NOT NULL,
                `record_time` VARCHAR(16) NULL,
                `type` VARCHAR(32) NOT NULL,
                `value` VARCHAR(64) NOT NULL,
                `unit` VARCHAR(32) NULL,
                `notes` TEXT NULL,
                `image_url` VARCHAR(500) NULL,
                `is_deleted` TINYINT NOT NULL DEFAULT 0,
                `created_at` VARCHAR(64) NOT NULL,
                `updated_at` VARCHAR(64) NOT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_user_date` (`user_id`, `record_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
