using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace DailyTracker.Api.Services;

public sealed class ProfileMySqlStore
{
    private readonly ProfileStoreOptions _options;

    public ProfileMySqlStore(IOptions<ProfileStoreOptions> options)
    {
        _options = options.Value;
    }

    public async Task<ProfileDto?> GetAsync(long userId, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT user_id, name, gender, age, height, weight, blood_type, blood_pressure, blood_sugar,
                   chronic_conditions, allergies, medications, health_goals, notes, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE user_id = @userId
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return Map(reader);
    }

    public async Task<ProfileDto> UpsertAsync(long userId, ProfileUpsertRequest request, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var existing = await GetAsync(userId, cancellationToken);
        var createdAt = existing?.CreatedAt ?? DateTimeOffset.UtcNow.ToString("O");
        var updatedAt = DateTimeOffset.UtcNow.ToString("O");

        var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO `{_options.TableName}`
                (user_id, name, gender, age, height, weight, blood_type, blood_pressure, blood_sugar,
                 chronic_conditions, allergies, medications, health_goals, notes, created_at, updated_at)
            VALUES
                (@userId, @name, @gender, @age, @height, @weight, @bloodType, @bloodPressure, @bloodSugar,
                 @chronicConditions, @allergies, @medications, @healthGoals, @notes, @createdAt, @updatedAt)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                gender = VALUES(gender),
                age = VALUES(age),
                height = VALUES(height),
                weight = VALUES(weight),
                blood_type = VALUES(blood_type),
                blood_pressure = VALUES(blood_pressure),
                blood_sugar = VALUES(blood_sugar),
                chronic_conditions = VALUES(chronic_conditions),
                allergies = VALUES(allergies),
                medications = VALUES(medications),
                health_goals = VALUES(health_goals),
                notes = VALUES(notes),
                updated_at = VALUES(updated_at);
            """;
        BindParameters(command, userId, request, createdAt, updatedAt);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return (await GetAsync(userId, cancellationToken))!;
    }

    public long GetDefaultUserId() => _options.DefaultUserId;

    private static ProfileDto Map(MySqlDataReader reader)
    {
        var userId = reader.GetOrdinal("user_id");
        var name = reader.GetOrdinal("name");
        var gender = reader.GetOrdinal("gender");
        var age = reader.GetOrdinal("age");
        var height = reader.GetOrdinal("height");
        var weight = reader.GetOrdinal("weight");
        var bloodType = reader.GetOrdinal("blood_type");
        var bloodPressure = reader.GetOrdinal("blood_pressure");
        var bloodSugar = reader.GetOrdinal("blood_sugar");
        var chronicConditions = reader.GetOrdinal("chronic_conditions");
        var allergies = reader.GetOrdinal("allergies");
        var medications = reader.GetOrdinal("medications");
        var healthGoals = reader.GetOrdinal("health_goals");
        var notes = reader.GetOrdinal("notes");
        var createdAt = reader.GetOrdinal("created_at");
        var updatedAt = reader.GetOrdinal("updated_at");

        return new ProfileDto
        {
            UserId = reader.GetInt64(userId),
            Name = reader.GetString(name),
            Gender = reader.GetString(gender),
            Age = reader.GetString(age),
            Height = reader.GetString(height),
            Weight = reader.GetString(weight),
            BloodType = reader.GetString(bloodType),
            BloodPressure = reader.GetString(bloodPressure),
            BloodSugar = reader.GetString(bloodSugar),
            ChronicConditions = reader.GetString(chronicConditions),
            Allergies = reader.GetString(allergies),
            Medications = reader.GetString(medications),
            HealthGoals = reader.GetString(healthGoals),
            Notes = reader.GetString(notes),
            CreatedAt = reader.GetString(createdAt),
            UpdatedAt = reader.GetString(updatedAt)
        };
    }

    private static void BindParameters(MySqlCommand command, long userId, ProfileUpsertRequest request, string createdAt, string updatedAt)
    {
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@name", request.Name ?? string.Empty);
        command.Parameters.AddWithValue("@gender", request.Gender ?? string.Empty);
        command.Parameters.AddWithValue("@age", request.Age ?? string.Empty);
        command.Parameters.AddWithValue("@height", request.Height ?? string.Empty);
        command.Parameters.AddWithValue("@weight", request.Weight ?? string.Empty);
        command.Parameters.AddWithValue("@bloodType", request.BloodType ?? string.Empty);
        command.Parameters.AddWithValue("@bloodPressure", request.BloodPressure ?? string.Empty);
        command.Parameters.AddWithValue("@bloodSugar", request.BloodSugar ?? string.Empty);
        command.Parameters.AddWithValue("@chronicConditions", request.ChronicConditions ?? string.Empty);
        command.Parameters.AddWithValue("@allergies", request.Allergies ?? string.Empty);
        command.Parameters.AddWithValue("@medications", request.Medications ?? string.Empty);
        command.Parameters.AddWithValue("@healthGoals", request.HealthGoals ?? string.Empty);
        command.Parameters.AddWithValue("@notes", request.Notes ?? string.Empty);
        command.Parameters.AddWithValue("@createdAt", createdAt);
        command.Parameters.AddWithValue("@updatedAt", updatedAt);
    }

    private MySqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("ProfileStore:ConnectionString is required.");
        }

        return new MySqlConnection(_options.ConnectionString);
    }

    private async Task EnsureTableAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        var command = connection.CreateCommand();
        command.CommandText = $"""
            CREATE TABLE IF NOT EXISTS `{_options.TableName}` (
                `user_id` BIGINT NOT NULL,
                `name` VARCHAR(128) NOT NULL DEFAULT '',
                `gender` VARCHAR(32) NOT NULL DEFAULT '',
                `age` VARCHAR(16) NOT NULL DEFAULT '',
                `height` VARCHAR(16) NOT NULL DEFAULT '',
                `weight` VARCHAR(16) NOT NULL DEFAULT '',
                `blood_type` VARCHAR(16) NOT NULL DEFAULT '',
                `blood_pressure` VARCHAR(64) NOT NULL DEFAULT '',
                `blood_sugar` VARCHAR(64) NOT NULL DEFAULT '',
                `chronic_conditions` TEXT NOT NULL,
                `allergies` TEXT NOT NULL,
                `medications` TEXT NOT NULL,
                `health_goals` TEXT NOT NULL,
                `notes` TEXT NOT NULL,
                `created_at` VARCHAR(64) NOT NULL,
                `updated_at` VARCHAR(64) NOT NULL,
                PRIMARY KEY (`user_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
