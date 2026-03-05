using HSTS.Domain.Entities;

namespace HSTS.Application.Auth.Interfaces
{
    public interface IJwtService
    {
        string GenerateAccessToken(Account account, User user, IList<string> roles);
        string GenerateRefreshToken();
    }
}
