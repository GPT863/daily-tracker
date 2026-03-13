namespace DailyTracker.Api.Models;

public sealed class ProfileDto
{
    public long UserId { get; init; }

    public string Name { get; init; } = string.Empty;

    public string Gender { get; init; } = string.Empty;

    public string Age { get; init; } = string.Empty;

    public string Height { get; init; } = string.Empty;

    public string Weight { get; init; } = string.Empty;

    public string BloodType { get; init; } = string.Empty;

    public string BloodPressure { get; init; } = string.Empty;

    public string BloodSugar { get; init; } = string.Empty;

    public string ChronicConditions { get; init; } = string.Empty;

    public string Allergies { get; init; } = string.Empty;

    public string Medications { get; init; } = string.Empty;

    public string HealthGoals { get; init; } = string.Empty;

    public string Notes { get; init; } = string.Empty;

    public string CreatedAt { get; init; } = string.Empty;

    public string UpdatedAt { get; init; } = string.Empty;
}
