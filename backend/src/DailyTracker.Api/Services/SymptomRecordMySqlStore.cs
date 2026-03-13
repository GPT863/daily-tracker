using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace DailyTracker.Api.Services;

public sealed class SymptomRecordMySqlStore
{
    private readonly SymptomRecordStoreOptions _options;

    public SymptomRecordMySqlStore(IOptions<SymptomRecordStoreOptions> options)
    {
        _options = options.Value;
    }

    public async Task<IReadOnlyList<SymptomRecordDto>> ListByDateAsync(
        long userId,
        string recordDate,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, record_date, record_time, description, measures, image_url, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE user_id = @userId AND record_date = @recordDate AND is_deleted = 0
            ORDER BY COALESCE(record_time, '00:00:00') ASC, id ASC;
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@recordDate", recordDate);

        var results = new List<SymptomRecordDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    public async Task<SymptomRecordDto> CreateAsync(
        long userId,
        SymptomRecordUpsertRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var now = DateTimeOffset.UtcNow.ToString("O");
        var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO `{_options.TableName}`
                (user_id, record_date, record_time, description, measures, image_url, is_deleted, created_at, updated_at)
            VALUES
                (@userId, @recordDate, @recordTime, @description, @measures, @imageUrl, 0, @createdAt, @updatedAt);
            SELECT LAST_INSERT_ID();
            """;
        command.Parameters.AddWithValue("@userId", userId);
        BindUpsertParameters(command, request, now);

        var insertedId = Convert.ToInt64(await command.ExecuteScalarAsync(cancellationToken));
        return (await GetByIdAsync(insertedId, userId, cancellationToken))!;
    }

    public async Task<SymptomRecordDto?> UpdateAsync(
        long id,
        long userId,
        SymptomRecordUpsertRequest request,
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
                description = @description,
                measures = @measures,
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

    private async Task<SymptomRecordDto?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, record_date, record_time, description, measures, image_url, created_at, updated_at
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

    private void BindUpsertParameters(MySqlCommand command, SymptomRecordUpsertRequest request, string now)
    {
        command.Parameters.AddWithValue("@recordDate", request.RecordDate);
        command.Parameters.AddWithValue("@recordTime", string.IsNullOrWhiteSpace(request.RecordTime) ? DBNull.Value : request.RecordTime);
        command.Parameters.AddWithValue("@description", request.Description);
        command.Parameters.AddWithValue("@measures", string.IsNullOrWhiteSpace(request.Measures) ? DBNull.Value : request.Measures);
        command.Parameters.AddWithValue("@imageUrl", string.IsNullOrWhiteSpace(request.ImageUrl) ? DBNull.Value : request.ImageUrl);
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);
    }

    private static SymptomRecordDto Map(MySqlDataReader reader)
    {
        var id = reader.GetOrdinal("id");
        var userId = reader.GetOrdinal("user_id");
        var recordDate = reader.GetOrdinal("record_date");
        var recordTime = reader.GetOrdinal("record_time");
        var description = reader.GetOrdinal("description");
        var measures = reader.GetOrdinal("measures");
        var imageUrl = reader.GetOrdinal("image_url");
        var createdAt = reader.GetOrdinal("created_at");
        var updatedAt = reader.GetOrdinal("updated_at");

        return new SymptomRecordDto
        {
            Id = reader.GetInt64(id),
            UserId = reader.GetInt64(userId),
            RecordDate = reader.GetString(recordDate),
            RecordTime = reader.IsDBNull(recordTime) ? null : reader.GetString(recordTime),
            Description = reader.GetString(description),
            Measures = reader.IsDBNull(measures) ? null : reader.GetString(measures),
            ImageUrl = reader.IsDBNull(imageUrl) ? null : reader.GetString(imageUrl),
            CreatedAt = reader.GetString(createdAt),
            UpdatedAt = reader.GetString(updatedAt)
        };
    }

    private MySqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("SymptomRecordStore:ConnectionString is required.");
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
                `description` TEXT NOT NULL,
                `measures` TEXT NULL,
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
