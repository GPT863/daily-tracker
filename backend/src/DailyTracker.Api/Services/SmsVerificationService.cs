using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace DailyTracker.Api.Services;

public sealed class SmsVerificationService
{
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(5);
    private readonly ConcurrentDictionary<string, SmsCodeEntry> _codes = new(StringComparer.Ordinal);

    public SmsSendResult IssueCode(string phone)
    {
        CleanupExpiredCodes();

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var expiresAt = DateTimeOffset.UtcNow.Add(CodeLifetime);

        _codes[phone] = new SmsCodeEntry(code, expiresAt);
        return new SmsSendResult(code, expiresAt, (int)CodeLifetime.TotalSeconds);
    }

    public bool VerifyCode(string phone, string code)
    {
        CleanupExpiredCodes();

        if (!_codes.TryGetValue(phone, out var entry))
        {
            return false;
        }

        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            _codes.TryRemove(phone, out _);
            return false;
        }

        if (!string.Equals(entry.Code, code, StringComparison.Ordinal))
        {
            return false;
        }

        _codes.TryRemove(phone, out _);
        return true;
    }

    private void CleanupExpiredCodes()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var pair in _codes)
        {
            if (pair.Value.ExpiresAt <= now)
            {
                _codes.TryRemove(pair.Key, out _);
            }
        }
    }

    private sealed record SmsCodeEntry(string Code, DateTimeOffset ExpiresAt);
}

public sealed record SmsSendResult(string Code, DateTimeOffset ExpiresAt, int ExpiresInSeconds);
