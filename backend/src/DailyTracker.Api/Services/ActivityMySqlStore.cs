using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace DailyTracker.Api.Services;

public sealed class ActivityMySqlStore
{
    private readonly ActivityStoreOptions _options;

    public ActivityMySqlStore(IOptions<ActivityStoreOptions> options)
    {
        _options = options.Value;
    }

    public async Task<IReadOnlyList<ActivityDto>> ListByDateAsync(
        long userId,
        string activityDate,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, activity_date, start_time, end_time, duration_minutes, type, content, feeling, image_url, source, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE user_id = @userId AND activity_date = @activityDate AND is_deleted = 0
            ORDER BY COALESCE(start_time, '00:00:00') ASC, id ASC;
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@activityDate", activityDate);

        var results = new List<ActivityDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    public async Task<ActivityDto> CreateAsync(
        long userId,
        ActivityUpsertRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var now = DateTimeOffset.UtcNow.ToString("O");
        var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO `{_options.TableName}`
                (user_id, activity_date, start_time, end_time, duration_minutes, type, content, feeling, image_url, source, is_deleted, created_at, updated_at)
            VALUES
                (@userId, @activityDate, @startTime, @endTime, @durationMinutes, @type, @content, @feeling, @imageUrl, @source, 0, @createdAt, @updatedAt);
            SELECT LAST_INSERT_ID();
            """;
        command.Parameters.AddWithValue("@userId", userId);
        BindUpsertParameters(command, request, now);

        var insertedId = Convert.ToInt64(await command.ExecuteScalarAsync(cancellationToken));
        return (await GetByIdAsync(insertedId, userId, cancellationToken))!;
    }

    public async Task<ActivityDto?> UpdateAsync(
        long id,
        long userId,
        ActivityUpsertRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE `{_options.TableName}`
            SET
                activity_date = @activityDate,
                start_time = @startTime,
                end_time = @endTime,
                duration_minutes = @durationMinutes,
                type = @type,
                content = @content,
                feeling = @feeling,
                image_url = @imageUrl,
                source = @source,
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

    private async Task<ActivityDto?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, user_id, activity_date, start_time, end_time, duration_minutes, type, content, feeling, image_url, source, created_at, updated_at
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

    private void BindUpsertParameters(MySqlCommand command, ActivityUpsertRequest request, string now)
    {
        command.Parameters.AddWithValue("@activityDate", request.ActivityDate);
        command.Parameters.AddWithValue("@startTime", string.IsNullOrWhiteSpace(request.StartTime) ? DBNull.Value : request.StartTime);
        command.Parameters.AddWithValue("@endTime", string.IsNullOrWhiteSpace(request.EndTime) ? DBNull.Value : request.EndTime);
        command.Parameters.AddWithValue("@durationMinutes", request.DurationMinutes.HasValue ? request.DurationMinutes.Value : DBNull.Value);
        command.Parameters.AddWithValue("@type", request.Type);
        command.Parameters.AddWithValue("@content", request.Content);
        command.Parameters.AddWithValue("@feeling", string.IsNullOrWhiteSpace(request.Feeling) ? DBNull.Value : request.Feeling);
        command.Parameters.AddWithValue("@imageUrl", string.IsNullOrWhiteSpace(request.ImageUrl) ? DBNull.Value : request.ImageUrl);
        command.Parameters.AddWithValue("@source", string.IsNullOrWhiteSpace(request.Source) ? "web" : request.Source);
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);
    }

    private static ActivityDto Map(MySqlDataReader reader)
    {
        var id = reader.GetOrdinal("id");
        var userId = reader.GetOrdinal("user_id");
        var activityDate = reader.GetOrdinal("activity_date");
        var startTime = reader.GetOrdinal("start_time");
        var endTime = reader.GetOrdinal("end_time");
        var durationMinutes = reader.GetOrdinal("duration_minutes");
        var type = reader.GetOrdinal("type");
        var content = reader.GetOrdinal("content");
        var feeling = reader.GetOrdinal("feeling");
        var imageUrl = reader.GetOrdinal("image_url");
        var source = reader.GetOrdinal("source");
        var createdAt = reader.GetOrdinal("created_at");
        var updatedAt = reader.GetOrdinal("updated_at");

        return new ActivityDto
        {
            Id = reader.GetInt64(id),
            UserId = reader.GetInt64(userId),
            ActivityDate = reader.GetString(activityDate),
            StartTime = reader.IsDBNull(startTime) ? null : reader.GetString(startTime),
            EndTime = reader.IsDBNull(endTime) ? null : reader.GetString(endTime),
            DurationMinutes = reader.IsDBNull(durationMinutes) ? null : reader.GetInt32(durationMinutes),
            Type = reader.GetString(type),
            Content = reader.GetString(content),
            Feeling = reader.IsDBNull(feeling) ? null : reader.GetString(feeling),
            ImageUrl = reader.IsDBNull(imageUrl) ? null : reader.GetString(imageUrl),
            Source = reader.IsDBNull(source) ? null : reader.GetString(source),
            CreatedAt = reader.GetString(createdAt),
            UpdatedAt = reader.GetString(updatedAt)
        };
    }

    private MySqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("ActivityStore:ConnectionString is required.");
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
                `activity_date` VARCHAR(16) NOT NULL,
                `start_time` VARCHAR(16) NULL,
                `end_time` VARCHAR(16) NULL,
                `duration_minutes` INT NULL,
                `type` VARCHAR(32) NOT NULL,
                `content` VARCHAR(255) NOT NULL,
                `feeling` TEXT NULL,
                `image_url` VARCHAR(500) NULL,
                `source` VARCHAR(32) NULL,
                `is_deleted` TINYINT NOT NULL DEFAULT 0,
                `created_at` VARCHAR(64) NOT NULL,
                `updated_at` VARCHAR(64) NOT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_user_date` (`user_id`, `activity_date`),
                KEY `idx_user_type_date` (`user_id`, `type`, `activity_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
