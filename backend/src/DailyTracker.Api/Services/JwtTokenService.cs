using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DailyTracker.Api.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DailyTracker.Api.Services;

public sealed class JwtTokenService
{
    private readonly AuthOptions _options;

    public JwtTokenService(IOptions<AuthOptions> options)
    {
        _options = options.Value;
    }

    public string CreateToken(UserRecord user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Account),
            new Claim("account", user.Account),
            new Claim("nickname", user.Nickname ?? user.Account)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.ExpireMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
