using DailyTracker.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace DailyTracker.Api.Services;

public sealed class UserMySqlStore
{
    private readonly UserStoreOptions _options;
    private readonly PasswordHasher<UserRecord> _passwordHasher = new();

    public UserMySqlStore(IOptions<UserStoreOptions> options)
    {
        _options = options.Value;
    }

    public async Task<UserRecord?> FindByAccountAsync(string account, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, account, password_hash, nickname, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE account = @account
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@account", account);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return Map(reader);
    }

    public async Task<UserRecord?> FindByIdAsync(long id, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, account, password_hash, nickname, created_at, updated_at
            FROM `{_options.TableName}`
            WHERE id = @id
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@id", id);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return Map(reader);
    }

    public async Task<UserRecord> CreateAsync(string account, string password, string? nickname, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var now = DateTimeOffset.UtcNow.ToString("O");
        var draft = new UserRecord
        {
            Account = account,
            Nickname = string.IsNullOrWhiteSpace(nickname) ? account : nickname
        };
        var passwordHash = _passwordHasher.HashPassword(draft, password);

        var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO `{_options.TableName}` (account, password_hash, nickname, status, created_at, updated_at)
            VALUES (@account, @passwordHash, @nickname, 1, @createdAt, @updatedAt);
            SELECT LAST_INSERT_ID();
            """;
        command.Parameters.AddWithValue("@account", account);
        command.Parameters.AddWithValue("@passwordHash", passwordHash);
        command.Parameters.AddWithValue("@nickname", string.IsNullOrWhiteSpace(nickname) ? account : nickname);
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);

        var id = Convert.ToInt64(await command.ExecuteScalarAsync(cancellationToken));
        return (await FindByIdAsync(id, cancellationToken))!;
    }

    public bool VerifyPassword(UserRecord user, string password)
    {
        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }

    private static UserRecord Map(MySqlDataReader reader)
    {
        int O(string name) => reader.GetOrdinal(name);
        return new UserRecord
        {
            Id = reader.GetInt64(O("id")),
            Account = reader.GetString(O("account")),
            PasswordHash = reader.GetString(O("password_hash")),
            Nickname = reader.IsDBNull(O("nickname")) ? null : reader.GetString(O("nickname")),
            CreatedAt = reader.GetString(O("created_at")),
            UpdatedAt = reader.GetString(O("updated_at"))
        };
    }

    private MySqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("UserStore:ConnectionString is required.");
        }

        return new MySqlConnection(_options.ConnectionString);
    }

    private async Task EnsureTableAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        var command = connection.CreateCommand();
        command.CommandText = $"""
            CREATE TABLE IF NOT EXISTS `{_options.TableName}` (
                `id` BIGINT NOT NULL AUTO_INCREMENT,
                `account` VARCHAR(64) NOT NULL,
                `password_hash` VARCHAR(255) NOT NULL,
                `nickname` VARCHAR(64) NULL,
                `status` TINYINT NOT NULL DEFAULT 1,
                `created_at` VARCHAR(64) NOT NULL,
                `updated_at` VARCHAR(64) NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_account` (`account`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
